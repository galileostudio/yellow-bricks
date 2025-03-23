package plugin

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	_ "github.com/databricks/databricks-sql-go"
	"github.com/galileo-stdio/yellow-bricks/pkg/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// Garante que Datasource implementa as interfaces necessárias
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

type Datasource struct {
	DB     *sql.DB
	config *models.PluginSettings
}

func parseQueryParams(req *backend.CallResourceRequest) (url.Values, error) {
	u, err := url.Parse("http://dummy.io/" + req.URL)
	if err != nil {
		return nil, err
	}
	return u.Query(), nil
}

func wrapErr(msg string, err error) backend.DataResponse {
	return backend.ErrDataResponse(backend.StatusInternal, fmt.Sprintf("%s: %v", msg, err))
}


func NewDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	config, err := models.LoadPluginSettings(settings)
	if err != nil {
		return nil, fmt.Errorf("fail to load config: %w", err)
	}

	connStr := fmt.Sprintf("token:%s@%s:443/%s", config.Token.Token, config.Host, config.Path)
	db, err := sql.Open("databricks", connStr)
	if err != nil {
		return nil, fmt.Errorf("fail to connect to Databricks: %w", err)
	}

	return &Datasource{DB: db, config: config}, nil
}

func (d *Datasource) Dispose() {
	if d.DB != nil {
		d.DB.Close()
	}
}

func injectCatalogIntoQuery(catalog, rawQuery string) string {

	const fromKeyword = "FROM "
	index := strings.Index(strings.ToUpper(rawQuery), fromKeyword)
	if index == -1 {
		return rawQuery
	}
	return rawQuery[:index+len(fromKeyword)] + catalog + "." + rawQuery[index+len(fromKeyword):]
}


func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {

    response := backend.NewQueryDataResponse()
    for _, q := range req.Queries {

        res := d.query(ctx, req.PluginContext, q)
        response.Responses[q.RefID] = res
    }

    return response, nil
}

type sqlQueryPayload struct {
	RawSQL string `json:"queryText"`
}

func (d *Datasource) query(ctx context.Context, _ backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse
	var qm sqlQueryPayload

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return wrapErr("json unmarshal", err)

	}

	catalog := d.config.Catalog
	adjustedQuery := injectCatalogIntoQuery(catalog, qm.RawSQL)

	rows, err := d.DB.QueryContext(ctx, adjustedQuery)
	if err != nil {
		return wrapErr("failed to execute query", err)
		
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return wrapErr("failed to retrieve columns", err)
		
	}

	frame := data.NewFrame("response")
	for _, col := range cols {
		frame.Fields = append(frame.Fields, data.NewField(col, nil, []string{}))
	}

	values := make([]interface{}, len(cols))
	for i := range values {
		var v interface{}
		values[i] = &v
	}

	for rows.Next() {
		if err := rows.Scan(values...); err != nil {
			return wrapErr("failed to scan row", err)
		}

		for i, valPtr := range values {
			v := *(valPtr.(*interface{}))
			strVal := fmt.Sprintf("%v", v)
			frame.Fields[i].Append(strVal)
		}
	}

	response.Frames = append(response.Frames, frame)
	return response
}

func (d *Datasource) CheckHealth(ctx context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	if err := d.DB.PingContext(ctx); err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Falha na conexão: %v", err),
		}, nil
	}
	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Conexão com Databricks está funcionando",
	}, nil
}

func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	catalog := d.config.Catalog
	if catalog == "" {
		return sendError(sender, backend.StatusBadRequest, "Catalog name is required")
	}

	switch req.Path {

	case "databases":

		databases, err := d.GetDatabases(ctx, catalog)
		if err != nil {
			return sendError(sender, backend.StatusInternal, err.Error())
		}
		return sendJSON(sender, databases)

	case "tables":

		u, err := parseQueryParams(req)
			if err != nil {
			return sendError(sender, backend.StatusBadRequest, "Invalid URL")
		}

		database := u.Get("database")

		if database == "" {
			return sendError(sender, backend.StatusBadRequest, "Database is required")
		}

		tables, err := d.GetTables(ctx, catalog, database)
		if err != nil {
			return sendError(sender, backend.StatusInternal, err.Error())
		}
		return sendJSON(sender, tables)
	

	case "columns":
		
		u, err := parseQueryParams(req)
		if err != nil {
			return sendError(sender, backend.StatusBadRequest, "Invalid URL")
		}

    	database := u.Get("database")

		table := u.Get("table")
		if table == "" {
			return sendError(sender, backend.StatusBadRequest, "Table is required")
		}

		columns, err := d.GetColumns(ctx, catalog, database, table)
		if err != nil {
			return sendError(sender, backend.StatusInternal, err.Error())
    	}
    	return sendJSON(sender, columns)
	
	}

	return sendError(sender, backend.StatusNotFound, "Invalid endpoint")
}

func (d *Datasource) GetDatabases(ctx context.Context, catalog string) ([]string, error) {

	query := fmt.Sprintf("SHOW SCHEMAS IN %s", catalog)

	rows, err := d.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var databases []string
	for rows.Next() {
		var database string
		if err := rows.Scan(&database); err != nil {
			return nil, err
		}
		databases = append(databases, database)
	}
	return databases, nil
}

func (d *Datasource) GetTables(ctx context.Context, catalog string, database string) ([]string, error) {

	query := fmt.Sprintf("SHOW TABLES IN %s.%s", catalog, database)

	rows, err := d.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	var isTemporary string

	for rows.Next() {
		var table string
		if err := rows.Scan(&database, &table, &isTemporary); err != nil {
			return nil, err
		}
		tables = append(tables, table)
		
	}

	return tables, nil
}

func (d *Datasource) GetColumns(ctx context.Context, catalog string, database string, table string) ([]string, error) {

    query := fmt.Sprintf("DESCRIBE TABLE %s.%s.%s", catalog, database, table) 

    rows, err := d.DB.QueryContext(ctx, query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var columns []string
    for rows.Next() {
        var columnName, columnType, comment string
        if err := rows.Scan(&columnName, &columnType, &comment); err != nil {
            return nil, err
        }
        columns = append(columns, columnName)
    }

    return columns, nil
}


func sendJSON(sender backend.CallResourceResponseSender, data interface{}) error {
	body, err := json.Marshal(data)
	if err != nil {
		return sendError(sender, backend.StatusInternal, "failed to marshal JSON")
	}

	return sender.Send(&backend.CallResourceResponse{Status: int(backend.StatusOK), Body: body})
}

func sendError(sender backend.CallResourceResponseSender, status backend.Status, message string) error {
	body := []byte(fmt.Sprintf(`{"error": "%s"}`, message))
	return sender.Send(&backend.CallResourceResponse{Status: int(status), Body: body})
}
