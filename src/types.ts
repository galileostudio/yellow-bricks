import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

/**
 * Representa uma seleção individual de campo no modo visual:
 * - Nome da coluna
 * - Agregação opcional (ex: COUNT, AVG, etc)
 * - Alias opcional
 */
export interface FieldSelection {
  column?: string;
  aggregation?: string;
  alias?: string;
}


/**
 * Estrutura principal da query do plugin.
 * Suporta dois modos:
 * - Raw Mode: usa `queryText`
 * - Visual Mode: usa `database`, `table` e `fields` (array de FieldSelection)
 */
// export interface DatabricksQuery extends DataQuery {
//   queryText?: string;

//   // Visual mode
//   database?: string;
//   table?: string;
//   fields?: FieldSelection[];
// }


export interface DatabricksQuery extends DataQuery {
  queryText?: string;

  // Visual mode
  format?: string;
  database?: string;
  table?: string;
  fields?: FieldSelection[];
  orderBy?: string;
  limit?: number;
  orderDirection?: string;

  enableFilter?: boolean;
  enableGroup?: boolean;
  enableOrder?: boolean;
  enablePreview?: boolean;
}

/**
 * Valor padrão para uma nova query.
 */
export const DEFAULT_QUERY: Partial<DatabricksQuery> = {
  fields: [],
};

/**
 * Configurações visíveis no editor de datasource.
 */
export interface DataBricksSourceOptions extends DataSourceJsonData {
  host?: string;
  path?: string;
  catalog?: string;
}

/**
 * Configurações sensíveis que não são enviadas ao frontend.
 */
export interface DataBricksSecureJsonData {
  token?: string;
}
