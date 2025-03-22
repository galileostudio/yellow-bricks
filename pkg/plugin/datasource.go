package plugin

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/url"
	"log"
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

func injectCatalogIntoQuery(catalog, rawQuery string) string {
	// Procura o primeiro FROM e injeta o catálogo
	// Exemplo: SELECT COUNT(coluna) FROM schema.tabela → SELECT COUNT(coluna) FROM catalog.schema.tabela
	const fromKeyword = "FROM "
	index := strings.Index(strings.ToUpper(rawQuery), fromKeyword)
	if index == -1 {
		return rawQuery // não altera se não encontrar FROM
	}
	return rawQuery[:index+len(fromKeyword)] + catalog + "." + rawQuery[index+len(fromKeyword):]
}


// QueryData processa as queries enviadas pelo Grafana
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
    log.Printf("[DEBUG] QueryData chamado! Número de queries: %d", len(req.Queries))

    response := backend.NewQueryDataResponse()
    for _, q := range req.Queries {
        log.Printf("[DEBUG] Processando query RefID: %s", q.RefID)
        res := d.query(ctx, req.PluginContext, q)
        response.Responses[q.RefID] = res
    }

    return response, nil
}

type queryModel struct {
	RawSQL string `json:"queryText"`
}

func (d *Datasource) query(ctx context.Context, _ backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse
	var qm queryModel

	log.Printf("[DESTRUCTION] Query recebida (raw): %s", string(query.JSON))

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		log.Printf("json unmarshal: %v", err.Error())
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	// Monta a query final com o catálogo
	catalog := d.config.Catalog
	adjustedQuery := injectCatalogIntoQuery(catalog, qm.RawSQL)

	log.Printf("[DESTRUCTION] Query ajustada: %s", adjustedQuery)

	rows, err := d.DB.QueryContext(ctx, adjustedQuery)
	if err != nil {
		log.Printf("[DESTRUCTION] erro ao executar query: %v", err.Error())
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("erro ao executar query: %v", err.Error()))
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		log.Printf("[DESTRUCTION] erro ao obter colunas: %v", err.Error())
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

		u, err := url.Parse("http://www.dummy.io/" + req.URL)

		if err != nil {
			return sendError(sender, backend.StatusBadRequest, "Invalid URL")
		}

		if catalog == "" {
			return sendError(sender, backend.StatusBadRequest, "Catalog is required")
		}

		database := u.Query().Get("database")

		if database == "" {
			return sendError(sender, backend.StatusBadRequest, "Database is required")
		}

		tables, err := d.GetTables(ctx, catalog, database)
		if err != nil {
			return sendError(sender, backend.StatusInternal, err.Error())
		}
		return sendJSON(sender, tables)
	

	case "columns":
		u, err := url.Parse("http://www.dummy.io/" + req.URL)
		if err != nil {
			return sendError(sender, backend.StatusBadRequest, "Invalid URL")
		}

		catalog := d.config.Catalog
    	database := u.Query().Get("database")

		table := u.Query().Get("table")
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

	log.Printf("[DESTRUCTION]: Catalog %s\n", catalog)
	log.Printf("[DESTRUCTION]: Database %s\n", database)
	log.Printf("[DESTRUCTION]: Table %s\n", table)

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
	// Serializa os dados em JSON
	body, err := json.Marshal(data)
	if err != nil {
		log.Printf("❌ [ERROR] Falha ao serializar JSON: %v", err)
		return sendError(sender, backend.StatusInternal, "failed to marshal JSON")
	}

	// LOG para verificar se a saída é um JSON válido
	log.Printf("📤 [DEBUG] JSON enviado: %s", string(body))

	// Envia a resposta para o frontend
	return sender.Send(&backend.CallResourceResponse{Status: int(backend.StatusOK), Body: body})
}


// Função auxiliar para enviar erro
func sendError(sender backend.CallResourceResponseSender, status backend.Status, message string) error {
	body := []byte(fmt.Sprintf(`{"error": "%s"}`, message))
	return sender.Send(&backend.CallResourceResponse{Status: int(status), Body: body})
}
