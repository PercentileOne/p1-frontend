using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Explain.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFreePeriodAndRecruiterLite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FreePeriodMonthlyCap",
                table: "EntitlementSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FreePeriodMonths",
                table: "EntitlementSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RecruiterPrepCap",
                table: "EntitlementSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "EntitlementSettings",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "FreePeriodMonthlyCap", "FreePeriodMonths", "RecruiterPrepCap" },
                values: new object[] { 3, 3, 10 });

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "IsSystemRole", "Name", "Slug" },
                values: new object[] { 6, true, "Recruiter (self-service)", "recruiter-lite" });

            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "PermissionId", "RoleId" },
                values: new object[,]
                {
                    { 1, 6 },
                    { 4, 6 },
                    { 5, 6 },
                    { 7, 6 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionId", "RoleId" },
                keyValues: new object[] { 1, 6 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionId", "RoleId" },
                keyValues: new object[] { 4, 6 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionId", "RoleId" },
                keyValues: new object[] { 5, 6 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionId", "RoleId" },
                keyValues: new object[] { 7, 6 });

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DropColumn(
                name: "FreePeriodMonthlyCap",
                table: "EntitlementSettings");

            migrationBuilder.DropColumn(
                name: "FreePeriodMonths",
                table: "EntitlementSettings");

            migrationBuilder.DropColumn(
                name: "RecruiterPrepCap",
                table: "EntitlementSettings");
        }
    }
}
