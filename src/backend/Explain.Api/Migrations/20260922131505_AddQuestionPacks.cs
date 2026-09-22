using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Explain.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionPacks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "QuestionPacks",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    JobRole = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FocusAreas = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    QuestionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    BuyerEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                    StripeCheckoutSessionId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    StripePaymentIntentId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    AmountGbp = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionPacks", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionPacks_StripeCheckoutSessionId",
                table: "QuestionPacks",
                column: "StripeCheckoutSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionPacks_StripePaymentIntentId",
                table: "QuestionPacks",
                column: "StripePaymentIntentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QuestionPacks");
        }
    }
}
