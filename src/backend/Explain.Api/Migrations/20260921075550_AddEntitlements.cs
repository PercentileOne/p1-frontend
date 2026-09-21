using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Explain.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEntitlements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StripeCustomerId",
                table: "Subscriptions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeSubscriptionId",
                table: "Subscriptions",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AccessGrants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Email = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GrantedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GrantedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccessGrants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InterviewUsages",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    EmailKey = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PassId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UkDay = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UkMonth = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Enforced = table.Column<bool>(type: "bit", nullable: false),
                    WouldBlock = table.Column<bool>(type: "bit", nullable: false),
                    VoidedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterviewUsages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_StripeSubscriptionId",
                table: "Subscriptions",
                column: "StripeSubscriptionId",
                unique: true,
                filter: "[StripeSubscriptionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AccessGrants_Email",
                table: "AccessGrants",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_AccessGrants_UserId",
                table: "AccessGrants",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_InterviewUsages_UserId_UkDay",
                table: "InterviewUsages",
                columns: new[] { "UserId", "UkDay" });

            migrationBuilder.CreateIndex(
                name: "IX_InterviewUsages_UserId_UkMonth",
                table: "InterviewUsages",
                columns: new[] { "UserId", "UkMonth" });

            migrationBuilder.CreateIndex(
                name: "UX_InterviewUsage_Taster",
                table: "InterviewUsages",
                column: "EmailKey",
                unique: true,
                filter: "[Source] = 'taster' AND [VoidedAt] IS NULL");

            // Launch seeding (Francis, 2026-09-21): every account that exists at this moment gets COMPLIMENTARY access, so switching the
            // paywall on later never locks out anyone already using the product; and the founder is staff. Harmless while enforcement is
            // off (the default). The admin Access page can re-run the first step at the moment enforcement is switched on, or revoke all
            // complimentary access in one click.
            migrationBuilder.Sql(@"
                INSERT INTO AccessGrants (Email, UserId, Kind, Reason, GrantedBy, GrantedAt)
                SELECT LOWER(LTRIM(RTRIM(u.Email))), u.Id, 'complimentary', 'Existing account at paywall launch', 'system', SYSUTCDATETIME()
                FROM Users u");
            migrationBuilder.Sql(@"
                INSERT INTO AccessGrants (Email, UserId, Kind, Reason, GrantedBy, GrantedAt)
                VALUES ('francis@percentile.one', (SELECT TOP 1 Id FROM Users WHERE LOWER(Email) = 'francis@percentile.one'), 'staff', 'Founder', 'system', SYSUTCDATETIME())");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccessGrants");

            migrationBuilder.DropTable(
                name: "InterviewUsages");

            migrationBuilder.DropIndex(
                name: "IX_Subscriptions_StripeSubscriptionId",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "StripeCustomerId",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "StripeSubscriptionId",
                table: "Subscriptions");
        }
    }
}
