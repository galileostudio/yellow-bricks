import React, { ChangeEvent } from 'react';
import { InlineField, Input, SecretInput } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataBricksSourceOptions, DataBricksSecureJsonData } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<DataBricksSourceOptions, DataBricksSecureJsonData> { }

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  const onHostChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        host: event.target.value,
      },
    });
  };

  const onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        path: event.target.value,
      },
    });
  };


  const onTokenChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        token: event.target.value,
      },
    });
  };

  const onResetToken = () => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        token: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        token: '',
      },
    });
  };

  return (
    <>
      <InlineField label="Host" labelWidth={14} interactive tooltip={'Json field returned to frontend'}>
        <Input
          id="config-editor-path"
          onChange={onHostChange}
          value={jsonData.host || ''}
          placeholder="Enter the Host, e.g. galileostdio-databricks.com"
          width={40}
        />
      </InlineField>

      <InlineField label="Path" labelWidth={14} interactive tooltip="Path for authentication">
        <Input
          id="config-editor-path"
          onChange={onPathChange}
          value={jsonData.path || ''}
          placeholder="Enter your path, e.g. /sql/1.0/warehouses/"
          width={40}
        />
      </InlineField>

      <InlineField label="Token" labelWidth={14} interactive tooltip={'Secure json field (backend only)'}>
        <SecretInput
          required
          id="config-editor-api-key"
          isConfigured={secureJsonFields.token}
          value={secureJsonData?.token}
          placeholder="Enter your access token"
          width={40}
          onReset={onResetToken}
          onChange={onTokenChange}
        />
      </InlineField>
    </>
  );
}
