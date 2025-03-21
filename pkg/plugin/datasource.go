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

// Garante que Datasource implementa as interfaces necessárias
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

// Estrutura principal do Datasource
type Datasource struct {
	DB     *sql.DB
	config *models.PluginSettings
}

// Cria uma nova instância do Datasource
func NewDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	config, err := models.LoadPluginSettings(settings)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar configurações: %w", err)
	}

	fmt.Println("🔍 Configuração carregada - Catalog:", config.Catalog)

	connStr := fmt.Sprintf("token:%s@%s:443/%s", config.Token.Token, config.Host, config.Path)
	db, err := sql.Open("databricks", connStr)
	if err != nil {
		return nil, fmt.Errorf("erro ao conectar ao Databricks: %w", err)
	}

	return &Datasource{DB: db, config: config}, nil
}

// Libera recursos da instância do datasource
func (d *Datasource) Dispose() {
	if d.DB != nil {
		d.DB.Close()
	}
}

// QueryData processa as queries enviadas pelo Grafana
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	response := backend.NewQueryDataResponse()

	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)
		response.Responses[q.RefID] = res
	}

	return response, nil
}

// Modelo para receber queries JSON
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

// CheckHealth verifica se o datasource está funcional
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

// CallResource expõe endpoints para obter catálogos, bancos e tabelas
func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	switch req.Path {

	case "databases":

		catalog := d.config.Catalog
		if catalog == "" {
			return sendError(sender, backend.StatusBadRequest, "Catalog name is required")
		}
		
		databases, err := d.GetDatabases(ctx, catalog)
		if err != nil {
			return sendError(sender, backend.StatusInternal, err.Error())
		}
		return sendJSON(sender, databases)

	case "tables":
		u, err := url.Parse("http://dummy?" + req.URL)
		if err != nil {
			return sendError(sender, backend.StatusBadRequest, "Invalid URL")
		}

		catalog := d.config.Catalog
		database := u.Query().Get("database")
		if catalog == "" || database == "" {
			return sendError(sender, backend.StatusBadRequest, "Catalog and database are required")
		}

		tables, err := d.GetTables(ctx, catalog, database)
		if err != nil {
			return sendError(sender, backend.StatusInternal, err.Error())
		}
		return sendJSON(sender, tables)
	}

	return sendError(sender, backend.StatusNotFound, "Invalid endpoint")
}

// Lista os databases dentro de um catálogo
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
	
	fmt.Print("DESTRUCTION Catalog: ", catalog)
	fmt.Print("DESTRUCTION Database: ", database)

	query := fmt.Sprintf("SHOW TABLES IN %s.%s", catalog, database)
	
	rows, err := d.DB.QueryContext(ctx, query)
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
