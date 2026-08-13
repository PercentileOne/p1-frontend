using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Explain.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPortalFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PortalFeedbacks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Occupation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AgeGroup = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HowHeard = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RatingsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Thoughts = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Improvements = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Recommend = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Source = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PortalFeedbacks", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PortalFeedbacks");
        }
    }
}
