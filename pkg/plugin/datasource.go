package plugin

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/url"

	_ "github.com/databricks/databricks-sql-go"
	"github.com/galileo-stdio/yellow-bricks/pkg/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// Assegura que a Datasource implementa as interfaces necessárias.
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

// Struct de configuração
type Datasource struct {
	DB     *sql.DB
	config *models.PluginSettings
}

// Criar nova instância do Datasource
func NewDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	config, err := models.LoadPluginSettings(settings)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar configurações: %w", err)
	}

	connStr := fmt.Sprintf("token:%s@%s:443/%s", config.Token.Token, config.Host, config.Path)

	db, err := sql.Open("databricks", connStr)
	if err != nil {
		return nil, fmt.Errorf("erro ao conectar ao Databricks: %w", err)
	}

	return &Datasource{DB: db, config: config}, nil
}

// Dispose limpa os recursos da instância do datasource.
func (d *Datasource) Dispose() {
	if d.DB != nil {
		d.DB.Close()
	}
}

// QueryData lida com as queries e retorna múltiplas respostas.
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	response := backend.NewQueryDataResponse()

	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)
		response.Responses[q.RefID] = res
	}

	return response, nil
}

// Modelo de query
type queryModel struct {
	RawSQL string `json:"queryText"`
}

func (d *Datasource) query(ctx context.Context, _ backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse
	var qm queryModel

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	rows, err := d.DB.QueryContext(ctx, qm.RawSQL)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("erro ao executar query: %v", err.Error()))
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return backend.ErrDataResponse(backend.StatusInternal, fmt.Sprintf("erro ao obter colunas: %v", err.Error()))
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
			return backend.ErrDataResponse(backend.StatusInternal, fmt.Sprintf("erro ao escanear linha: %v", err.Error()))
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

// CheckHealth lida com verificações de saúde do datasource.
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

// CallResource expõe endpoints para obter tabelas e colunas.
func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	switch req.Path {
	
	case "query-types":
		queryTypes := []string{"SQL", "Table", "Metadata"}
		return sendJSON(sender, map[string][]string{"queryTypes": queryTypes})
	
	case "tables":
		tables, err := d.GetTables(ctx)
		if err != nil {
			return sendError(sender, backend.StatusInternal, err.Error())
		}
		return sendJSON(sender, tables)

	case "columns":
		u, err := url.Parse("http://dummy?" + req.URL)
		if err != nil {
			return sendError(sender, backend.StatusBadRequest, "Invalid URL")
		}

		tableName := u.Query().Get("table")
		if tableName == "" {
			return sendError(sender, backend.StatusBadRequest, "table name is required")
		}

		columns, err := d.GetColumns(ctx, tableName)
		if err != nil {
			return sendError(sender, backend.StatusInternal, err.Error())
		}
		return sendJSON(sender, columns)
	}

	return sendError(sender, backend.StatusNotFound, "Invalid endpoint")
}

// GetTables retorna as tabelas do Databricks.
func (d *Datasource) GetTables(ctx context.Context) ([]string, error) {
	rows, err := d.DB.QueryContext(ctx, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'default'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			return nil, err
		}
		tables = append(tables, table)
	}
	return tables, nil
}

// GetColumns retorna as colunas de uma tabela.
func (d *Datasource) GetColumns(ctx context.Context, tableName string) ([]string, error) {
	query := fmt.Sprintf("SELECT column_name FROM information_schema.columns WHERE table_name = '%s'", tableName)
	rows, err := d.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var column string
		if err := rows.Scan(&column); err != nil {
			return nil, err
		}
		columns = append(columns, column)
	}
	return columns, nil
}

// Função auxiliar para enviar JSON
func sendJSON(sender backend.CallResourceResponseSender, data interface{}) error {
	body, err := json.Marshal(data)
	if err != nil {
		return sendError(sender, backend.StatusInternal, "failed to marshal JSON")
	}
	return sender.Send(&backend.CallResourceResponse{Status: int(backend.StatusOK), Body: body})
}

// Função auxiliar para enviar erro
func sendError(sender backend.CallResourceResponseSender, status backend.Status, message string) error {
	body := []byte(fmt.Sprintf(`{"error": "%s"}`, message))
	return sender.Send(&backend.CallResourceResponse{Status: int(status), Body: body})
}
