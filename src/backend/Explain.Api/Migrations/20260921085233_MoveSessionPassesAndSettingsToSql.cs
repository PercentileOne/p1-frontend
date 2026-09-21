using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Explain.Api.Migrations
{
    /// <inheritdoc />
    public partial class MoveSessionPassesAndSettingsToSql : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EntitlementSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Enforce = table.Column<bool>(type: "bit", nullable: false),
                    DailyCap = table.Column<int>(type: "int", nullable: false),
                    MonthlyCap = table.Column<int>(type: "int", nullable: false),
                    TasterEnabled = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntitlementSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InterviewPasses",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RecipientEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    RecipientName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RecipientJobTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TierId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SenderName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SenderEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StripeCheckoutSessionId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    StripePaymentIntentId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    AmountGbp = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SessionsTotal = table.Column<int>(type: "int", nullable: false),
                    SessionsUsed = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RedeemedByUserId = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterviewPasses", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "EntitlementSettings",
                columns: new[] { "Id", "DailyCap", "Enforce", "MonthlyCap", "TasterEnabled", "UpdatedAt", "UpdatedBy" },
                values: new object[] { 1, 3, false, 10, true, new DateTime(2026, 9, 21, 0, 0, 0, 0, DateTimeKind.Utc), "system" });

            migrationBuilder.CreateIndex(
                name: "IX_InterviewPasses_RecipientEmail_Status",
                table: "InterviewPasses",
                columns: new[] { "RecipientEmail", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_InterviewPasses_StripeCheckoutSessionId",
                table: "InterviewPasses",
                column: "StripeCheckoutSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_InterviewPasses_StripePaymentIntentId",
                table: "InterviewPasses",
                column: "StripePaymentIntentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EntitlementSettings");

            migrationBuilder.DropTable(
                name: "InterviewPasses");
        }
    }
}
