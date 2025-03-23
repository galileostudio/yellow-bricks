# <img src="src/img/logo.svg" alt="YellowBricks Logo" width="25" /> YellowBricks Datasource Plugin

YellowBricks is a Grafana datasource plugin for Databricks that empowers you to build and execute SQL queries using a dynamic visual query builder or by writing raw SQL. It supports various query formats and advanced options like filtering, grouping, ordering, and previewing results.

## Features

- **Visual Query Builder:**  
  Easily construct queries by selecting the database, table, and columns. Customize your query with optional aggregations, aliases, filters, grouping, and ordering.

- **Raw SQL Mode:**  
  For advanced users, switch to raw mode and write SQL queries directly.

- **Dynamic Preview:**  
  Preview the generated SQL query in a formatted, beautified style before execution.

- **Flexible Format Options:**  
  Choose between `table` and `timeseries` output formats. If timeseries is selected, the plugin verifies that a time column (e.g., "time" or "timestamp") is present.

- **Secure Connection:**  
  Connects to Databricks using token-based authentication. The backend also includes basic validation to prevent unsafe queries.

## Installation

1. **Copy the Plugin:**  
   Place the YellowBricks plugin folder into your Grafana plugins directory (e.g., `/var/lib/grafana/plugins`).

2. **Restart Grafana:**  
   Restart the Grafana server to load the new plugin.

3. **Add a New Datasource:**  
   In Grafana, go to **Configuration > Data Sources** and add a new datasource of type **YellowBricks**.

## Configuration

When configuring the YellowBricks datasource, provide the following details:

- **Host:**  
  Your Databricks host (e.g., `dbc-xxxxxxxxxx.cloud.databricks.com`).

- **Path:**  
  The HTTP path for your Databricks SQL Warehouse (e.g., `/sql/1.0/warehouses/your_warehouse_id`).

- **Token:**  
  Your Databricks access token.

- **Catalog:**  
  The catalog name (e.g., `hive_metastore`).

## Usage

### Visual Mode

1. **Select Format:**  
   Choose between **Table** and **Time series** in the toolbar.  
   - **Time series:** Ensure your query returns a time column (e.g., `time` or `timestamp`).
   - **Table:** No special time column is required.

2. **Dynamic Query Building:**  
   Use the query builder to:
   - Select the database and table.
   - Choose columns and specify aggregations/aliases.
   - Configure additional options like filters, grouping, and ordering.

3. **Preview:**  
   The plugin generates a formatted SQL preview based on your selections.

4. **Run Query:**  
   Execute the query by clicking the **Run Query** button.

### Raw Mode

- Switch to raw mode to write your SQL query manually in the code editor.
- The plugin applies the same backend validations and injects the configured catalog automatically.

## Development

YellowBricks is developed and maintained by **Galileo Stdio**.

### Getting Started with Development

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/galileo-stdio/yellow-bricks-datasource.git
   cd yellow-bricks-datasource
   ```

2. **Install Dependencies:**

   ```bash
   go mod tidy
   ```

3. **Build the Plugin:**

   Use your preferred build tool (e.g., `mage` or `go build`) to compile the plugin.

4. **Run Tests:**

   Execute the tests with:

   ```bash
   go test ./...
   ```

5. **Refer to Grafana’s Plugin Development Guide:**

   See [Grafana Plugin Tools](https://grafana.com/developers/plugins) for detailed instructions.

## Troubleshooting

- **Missing Time Column (Time series Format):**  
  If you select the timeseries format but your query result doesn’t contain a time column (e.g., `time` or `timestamp`), the plugin will return an error. Make sure your data includes a proper time column or switch to table format.

- **Duplicate Column Names:**  
  The plugin validates that there are no duplicate column names (unless aliases are used). If duplicates are found, adjust your query or use aliases accordingly.

- **Connection Errors:**  
  Verify that your Databricks credentials, host, path, and token are correct in the configuration.

## License

This plugin is licensed under the [MIT License](LICENSE).

## Author

**Galileo Stdio**  
[Your Website or Contact Info]

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests. For any issues or feature requests, please open an issue on [GitHub](https://github.com/galileo-stdio/yellow-bricks-datasource).

---

*For more detailed documentation, refer to the [Grafana Plugin Developer Guide](https://grafana.com/developers/plugins).*
