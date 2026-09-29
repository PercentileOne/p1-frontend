using System.Buffers.Binary;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

namespace Explain.Api.Infrastructure.Geo;

/// <summary>Who owns the network an address belongs to, and whether that owner is a machine (cloud, hosting, crawler) rather than a home/mobile ISP.</summary>
public record IpOwner(int Asn, string Name, bool IsMachine);

/// <summary>
/// Answers "is this visit from a person's own connection, or from a crawler / cloud server?" for the admin visitor funnel
/// (Francis, 2026-09-29 — the funnel's "real visitor" test alone let a Google Cloud bot through, and hid that ~half of all visits
/// are genuine people who simply read the page and left).
///
/// Data: the public-domain ip2asn database (iptoasn.com — IP range → network number + owner name), downloaded once a day into memory.
/// No visitor address is ever sent anywhere (unlike the web-API geo providers) — the lookup is a local binary search.
/// If the download fails, the resolver simply returns null for everything and the funnel behaves exactly as it did before.
/// </summary>
public class IpOwnerService
{
    private const string V4Url = "https://iptoasn.com/data/ip2asn-v4.tsv.gz";
    private const string V6Url = "https://iptoasn.com/data/ip2asn-v6.tsv.gz";
    private static readonly TimeSpan MaxAge = TimeSpan.FromHours(24);
    private const long MaxDecompressedBytes = 120L * 1024 * 1024; // guard against a bad/hostile download filling memory

    // Owner names that mean "a machine": cloud, hosting, datacentre, search/social/SEO crawlers and security scanners.
    // Matched against the network owner's registered name, never against a person's ISP (BT, Vodafone, Jio, Starlink… don't match).
    private static readonly Regex MachineName = new(
        @"hosting|cloud|data ?cent(er|re)|server|\bvps\b|colocation|colocrossing|\bcdn\b|amazon|google|microsoft|facebook|meta platforms|" +
        @"digitalocean|hetzner|\bovh|linode|vultr|choopa|leaseweb|ahrefs|semrush|packethub|contabo|scaleway|\bm247\b|datacamp|tencent|" +
        @"alibaba|oracle|akamai|fastly|zscaler|netskope|\bibm\b|softlayer|rackspace|godaddy|namecheap|psychz|quadranet|equinix|sharktech|" +
        @"frantech|buyvm|zenlayer|ucloud|baidu|egihosting|logicweb|internap",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private sealed class Table
    {
        public uint[] V4Start = [], V4End = [];
        public int[] V4Asn = [];
        public UInt128[] V6Start = [], V6End = [];
        public int[] V6Asn = [];
        public Dictionary<int, IpOwner> Owners = new();
        public DateTime LoadedAt;
    }

    private readonly ILogger<IpOwnerService> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private volatile Table? _table;
    private DateTime _lastFailedAt = DateTime.MinValue;

    // Deliberately a raw HttpClient with a long timeout: two files of a few MB, fetched at most once a day.
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(60) };

    public IpOwnerService(ILogger<IpOwnerService> logger) { _logger = logger; }

    /// <summary>A lookup function for a batch of addresses. Never throws: if the data isn't available it returns a function that yields null.</summary>
    public async Task<Func<string?, IpOwner?>> GetResolverAsync(CancellationToken ct = default)
    {
        var table = _table;
        if (table is null || DateTime.UtcNow - table.LoadedAt > MaxAge)
        {
            // After a failed attempt, don't hammer the source on every request — wait a few minutes.
            if (DateTime.UtcNow - _lastFailedAt > TimeSpan.FromMinutes(10))
            {
                await _gate.WaitAsync(ct);
                try
                {
                    table = _table;
                    if (table is null || DateTime.UtcNow - table.LoadedAt > MaxAge)
                    {
                        try { table = await LoadAsync(ct); _table = table; }
                        catch (Exception ex) when (ex is not OperationCanceledException)
                        {
                            _lastFailedAt = DateTime.UtcNow;
                            _logger.LogWarning("IP owner database couldn't be loaded ({Message}) — funnel falls back to the interaction test alone.", ex.Message);
                        }
                    }
                }
                finally { _gate.Release(); }
            }
        }
        table = _table; // a stale table is still better than none
        return table is null ? _ => null : ip => Lookup(table, ip);
    }

    private static IpOwner? Lookup(Table t, string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip) || !IPAddress.TryParse(ip, out var addr)) return null;
        if (addr.IsIPv4MappedToIPv6) addr = addr.MapToIPv4();
        var bytes = addr.GetAddressBytes();
        int asn;
        if (addr.AddressFamily == AddressFamily.InterNetwork)
        {
            var v = BinaryPrimitives.ReadUInt32BigEndian(bytes);
            var i = Array.BinarySearch(t.V4Start, v);
            if (i < 0) i = ~i - 1;
            if (i < 0 || v > t.V4End[i]) return null;
            asn = t.V4Asn[i];
        }
        else if (addr.AddressFamily == AddressFamily.InterNetworkV6)
        {
            var v = new UInt128(BinaryPrimitives.ReadUInt64BigEndian(bytes.AsSpan(0, 8)), BinaryPrimitives.ReadUInt64BigEndian(bytes.AsSpan(8, 8)));
            var i = Array.BinarySearch(t.V6Start, v);
            if (i < 0) i = ~i - 1;
            if (i < 0 || v > t.V6End[i]) return null;
            asn = t.V6Asn[i];
        }
        else return null;
        return t.Owners.TryGetValue(asn, out var owner) ? owner : null;
    }

    private async Task<Table> LoadAsync(CancellationToken ct)
    {
        var t = new Table { LoadedAt = DateTime.UtcNow };
        var v4Start = new List<uint>(); var v4End = new List<uint>(); var v4Asn = new List<int>();
        var v6Start = new List<UInt128>(); var v6End = new List<UInt128>(); var v6Asn = new List<int>();

        foreach (var url in new[] { V4Url, V6Url })
        {
            using var resp = await Http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            resp.EnsureSuccessStatusCode();
            await using var net = await resp.Content.ReadAsStreamAsync(ct);
            await using var gz = new GZipStream(net, CompressionMode.Decompress);
            using var reader = new StreamReader(new LimitedStream(gz, MaxDecompressedBytes));
            string? line;
            while ((line = await reader.ReadLineAsync(ct)) is not null)
            {
                // range_start \t range_end \t AS_number \t country_code \t AS_description
                var p = line.Split('\t');
                if (p.Length < 5 || !int.TryParse(p[2], out var asn) || asn == 0) continue; // 0 = not routed
                if (!IPAddress.TryParse(p[0], out var a) || !IPAddress.TryParse(p[1], out var b)) continue;
                if (!t.Owners.ContainsKey(asn))
                {
                    var name = p[4].Trim();
                    t.Owners[asn] = new IpOwner(asn, name, MachineName.IsMatch(name) && !name.Contains("fiber", StringComparison.OrdinalIgnoreCase));
                }
                if (a.AddressFamily == AddressFamily.InterNetwork)
                {
                    v4Start.Add(BinaryPrimitives.ReadUInt32BigEndian(a.GetAddressBytes()));
                    v4End.Add(BinaryPrimitives.ReadUInt32BigEndian(b.GetAddressBytes()));
                    v4Asn.Add(asn);
                }
                else
                {
                    var ab = a.GetAddressBytes(); var bb = b.GetAddressBytes();
                    v6Start.Add(new UInt128(BinaryPrimitives.ReadUInt64BigEndian(ab.AsSpan(0, 8)), BinaryPrimitives.ReadUInt64BigEndian(ab.AsSpan(8, 8))));
                    v6End.Add(new UInt128(BinaryPrimitives.ReadUInt64BigEndian(bb.AsSpan(0, 8)), BinaryPrimitives.ReadUInt64BigEndian(bb.AsSpan(8, 8))));
                    v6Asn.Add(asn);
                }
            }
        }

        // The source is sorted by start address, but sort defensively — the binary search depends on it.
        var order4 = Enumerable.Range(0, v4Start.Count).OrderBy(i => v4Start[i]).ToArray();
        t.V4Start = order4.Select(i => v4Start[i]).ToArray(); t.V4End = order4.Select(i => v4End[i]).ToArray(); t.V4Asn = order4.Select(i => v4Asn[i]).ToArray();
        var order6 = Enumerable.Range(0, v6Start.Count).OrderBy(i => v6Start[i]).ToArray();
        t.V6Start = order6.Select(i => v6Start[i]).ToArray(); t.V6End = order6.Select(i => v6End[i]).ToArray(); t.V6Asn = order6.Select(i => v6Asn[i]).ToArray();
        _logger.LogInformation("IP owner database loaded: {V4} IPv4 ranges, {V6} IPv6 ranges, {Asns} networks.", t.V4Start.Length, t.V6Start.Length, t.Owners.Count);
        return t;
    }

    // Stops reading after a fixed number of bytes so a corrupt or malicious archive can't exhaust memory.
    private sealed class LimitedStream(Stream inner, long limit) : Stream
    {
        private long _read;
        public override int Read(byte[] buffer, int offset, int count)
        {
            var n = inner.Read(buffer, offset, (int)Math.Min(count, Math.Max(0, limit - _read)));
            _read += n;
            if (_read >= limit && n == 0) throw new InvalidDataException("IP database larger than the safety limit.");
            return n;
        }
        public override bool CanRead => true; public override bool CanSeek => false; public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
