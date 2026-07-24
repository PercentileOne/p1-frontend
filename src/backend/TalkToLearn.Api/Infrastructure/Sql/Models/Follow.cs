namespace TalkToLearn.Api.Infrastructure.Sql.Models;

public class Follow
{
    public int      Id          { get; set; }
    public string   FollowerId  { get; set; } = string.Empty;
    public string   FolloweeId  { get; set; } = string.Empty;
    public DateTime FollowedAt  { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Follower { get; set; } = null!;
    public User Followee { get; set; } = null!;
}
