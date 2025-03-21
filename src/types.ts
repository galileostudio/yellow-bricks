import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface DatabricksQuery extends DataQuery {
  queryText?: string;
  table?: string;
  column?: string;
  limit?: number;
}


export const DEFAULT_QUERY: Partial<DatabricksQuery> = {};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface DataBricksSourceOptions extends DataSourceJsonData {
  host?: string;
  path?: string;
  catalog?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface DataBricksSecureJsonData {
  token?: string;
}

export interface QueryTypesResponse {
  queryTypes: string[];
}

export interface DatabricksQuery {
  queryText?: string;
  database?: string;
  table?: string;
  column?: string;
  aggregation?: string;
}
