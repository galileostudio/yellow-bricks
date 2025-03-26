import React, {useEffect} from 'react';
import { InlineField, Input, SecretInput, Select, Switch } from '@grafana/ui';
import { SelectableValue, DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataBricksSourceOptions, DataBricksSecureJsonData } from '../../types';

interface Props extends DataSourcePluginOptionsEditorProps<DataBricksSourceOptions, DataBricksSecureJsonData> {}

const authTypes: Array<SelectableValue<string>> = [
  { label: 'Personal Access Token', value: 'pat' },
  // { label: 'OAuth M2M', value: 'oauth-m2m' },
  // { label: 'Azure (On-Behalf-Of)', value: 'azure-obo' },
];

const azureCloudOptions: Array<SelectableValue<string>> = [
  { label: 'Azure', value: 'Azure' },
  // { label: 'Azure China', value: 'AzureChina' },
  // { label: 'Azure US Gov', value: 'AzureUSGov' },
];

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;

  useEffect(() => {
    const defaults: Partial<DataBricksSourceOptions> = {
      retries: 5,
      pause: 0,
      timeout: 60,
      maxRows: 10000,
      retryTimeout: 40,
      debug: false,
    };
  
    const patch: Partial<DataBricksSourceOptions> = {};
    for (const [key, defVal] of Object.entries(defaults)) {
      const typedKey = key as keyof DataBricksSourceOptions;
      if (jsonData[typedKey] === undefined) {
        patch[typedKey] = defVal as any;
      }
    }
  
    if (Object.keys(patch).length > 0) {
      onOptionsChange({
        ...options,
        jsonData: {
          ...jsonData,
          ...patch,
        },
      });
    }
  }, []);
  
  
  const { jsonData, secureJsonFields, secureJsonData } = options;

  const updateJson = (key: keyof DataBricksSourceOptions, value: any) =>
    onOptionsChange({ ...options, jsonData: { ...jsonData, [key]: value } });

  const updateSecure = (key: keyof DataBricksSecureJsonData, value: string) =>
    onOptionsChange({ ...options, secureJsonData: { ...secureJsonData, [key]: value } });

  const resetSecure = (key: string) =>
    onOptionsChange({
      ...options,
      secureJsonFields: { ...secureJsonFields, [key]: false },
      secureJsonData: { ...secureJsonData, [key]: '' },
    });

  const authType = jsonData.authType || 'pat';

  return (
    <>
      {/* Configurações Gerais */}
      <InlineField label="Host" labelWidth={20}>
        <Input
          value={jsonData.host || ''}
          onChange={(e) => updateJson('host', e.currentTarget.value)}
          placeholder="dbc-xxxx.cloud.databricks.com"
          width={40}
        />
      </InlineField>

      <InlineField label="Http Path" labelWidth={20}>
        <Input
          value={jsonData.path || ''}
          onChange={(e) => updateJson('path', e.currentTarget.value)}
          placeholder="/sql/1.0/warehouses/xyz"
          width={40}
        />
      </InlineField>

      <InlineField label="Authentication Type" labelWidth={20}>
        <Select
          options={authTypes}
          value={authType}
          onChange={(v) => updateJson('authType', v.value)}
          width={40}
        />
      </InlineField>

      {/* --- Autenticações --- */}

      {/* PAT */}
      {authType === 'pat' && (
        <InlineField label="Token" labelWidth={20}>
          <SecretInput
            isConfigured={secureJsonFields.token}
            value={secureJsonData?.token}
            placeholder="Enter your access token"
            width={40}
            onChange={(e) => updateSecure('token', e.currentTarget.value)}
            onReset={() => resetSecure('token')}
          />
        </InlineField>
      )}

      {/* OAuth M2M */}
      {authType === 'oauth-m2m' && (
        <>
          <InlineField label="Client ID" labelWidth={20}>
            <Input
              value={secureJsonData?.clientId || ''}
              onChange={(e) => updateSecure('clientId', e.currentTarget.value)}
              width={40}
              placeholder="Your client ID"
            />
          </InlineField>

          <InlineField label="Client Secret" labelWidth={20}>
            <SecretInput
              isConfigured={secureJsonFields.clientSecret}
              value={secureJsonData?.clientSecret}
              placeholder="Client Secret"
              width={40}
              onChange={(e) => updateSecure('clientSecret', e.currentTarget.value)}
              onReset={() => resetSecure('clientSecret')}
            />
          </InlineField>
        </>
      )}

      {/* Azure OBO */}
      {authType === 'azure-obo' && (
        <>
          <InlineField label="Azure Cloud" labelWidth={20}>
            <Select
              options={azureCloudOptions}
              value={jsonData.azureCloud || 'Azure'}
              onChange={(v) => updateJson('azureCloud', v.value)}
              width={40}
            />
          </InlineField>

          <InlineField label="Directory (tenant) ID" labelWidth={20}>
            <Input
              value={jsonData.tenantId || ''}
              onChange={(e) => updateJson('tenantId', e.currentTarget.value)}
              width={40}
            />
          </InlineField>

          <InlineField label="Application (client) ID" labelWidth={20}>
            <Input
              value={jsonData.clientId || ''}
              onChange={(e) => updateJson('clientId', e.currentTarget.value)}
              width={40}
            />
          </InlineField>

          <InlineField label="Client Secret" labelWidth={20}>
            <SecretInput
              isConfigured={secureJsonFields.clientSecret}
              value={secureJsonData?.clientSecret}
              placeholder="Client Secret"
              width={40}
              onChange={(e) => updateSecure('clientSecret', e.currentTarget.value)}
              onReset={() => resetSecure('clientSecret')}
            />
          </InlineField>
        </>
      )}

      {/* Opções de Uso */}
      <InlineField label="Catalog" labelWidth={20}>
        <Input
          value={jsonData.catalog}
          placeholder='main'
          onChange={(e) => updateJson('catalog', e.currentTarget.value)}
          width={40}
        />
      </InlineField>
      <InlineField label="Retries" labelWidth={20}>
        <Input
          type="number"
          value={jsonData.retries ?? 5}
          onChange={(e) => updateJson('retries', Number(e.currentTarget.value))}
          width={40}
        />
      </InlineField>

      <InlineField label="Pause" labelWidth={20}>
        <Input
          type="number"
          value={jsonData.pause ?? 0}
          onChange={(e) => updateJson('pause', Number(e.currentTarget.value))}
          width={40}
        />
      </InlineField>

      <InlineField label="Timeout" labelWidth={20}>
        <Input
          type="number"
          value={jsonData.timeout ?? 60}
          onChange={(e) => updateJson('timeout', Number(e.currentTarget.value))}
          width={40}
        />
      </InlineField>

      <InlineField label="Max Rows" labelWidth={20}>
        <Input
          type="number"
          value={jsonData.maxRows ?? 10000}
          onChange={(e) => updateJson('maxRows', Number(e.currentTarget.value))}
          width={40}
        />
      </InlineField>

      <InlineField label="Retry Timeout" labelWidth={20}>
        <Input
          type="number"
          value={jsonData.retryTimeout ?? 40}
          onChange={(e) => updateJson('retryTimeout', Number(e.currentTarget.value))}
          width={40}
        />
      </InlineField>

      <InlineField label="Debug" labelWidth={20}>
        <Switch
          value={jsonData.debug || false}
          onChange={(e) => updateJson('debug', e.currentTarget.checked)}
        />
      </InlineField>
    </>
  );
}
