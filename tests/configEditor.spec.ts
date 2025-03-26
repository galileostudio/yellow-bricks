import { test, expect } from '@grafana/plugin-e2e';
import { DataBricksSourceOptions, DataBricksSecureJsonData } from '../src/types';

test('config editor: should render correctly', async ({ createDataSourceConfigPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await createDataSourceConfigPage({ type: ds.type });

  await expect(page.getByLabel('Catalog')).toBeVisible();
  await expect(page.getByLabel('Path')).toBeVisible();
  await expect(page.getByLabel('Token')).toBeVisible();
  await expect(page.getByLabel('Host')).toBeVisible();
});

test('config editor: should succeed with valid config', async ({ createDataSourceConfigPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource<DataBricksSourceOptions, DataBricksSecureJsonData>({ fileName: 'datasources.yml' });
  const configPage = await createDataSourceConfigPage({ type: ds.type });

  await page.getByLabel('Host').fill(ds.jsonData.host ?? '');
  await page.getByLabel('Path').fill(ds.jsonData.path ?? '');
  await page.getByLabel('Catalog').fill(ds.jsonData.catalog ?? '');
  await page.getByLabel('Token').fill(ds.secureJsonData?.token ?? '');

  await expect(configPage.saveAndTest()).toBeOK();
});

test('config editor: should fail with missing token', async ({ createDataSourceConfigPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource<DataBricksSourceOptions, DataBricksSecureJsonData>({ fileName: 'datasources.yml' });
  const configPage = await createDataSourceConfigPage({ type: ds.type });

  await page.getByLabel('Host').fill(ds.jsonData.host ?? '');
  await page.getByLabel('Path').fill(ds.jsonData.path ?? '');
  await page.getByLabel('Catalog').fill(ds.jsonData.catalog ?? '');

  // Não preenche Token intencionalmente
  await expect(configPage.saveAndTest()).not.toBeOK();
  await expect(configPage).toHaveAlert('error', { hasText: 'Token is missing' });
});
