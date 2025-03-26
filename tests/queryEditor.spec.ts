import { test, expect } from '@grafana/plugin-e2e';

test('query editor: should load databases and tables correctly', async ({ panelEditPage, readProvisionedDataSource }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);

  const databaseSelect = panelEditPage.getQueryEditorRow('A').getByLabel('Database');
  await expect(databaseSelect).toBeVisible();
  await databaseSelect.click();
  const dbOptionsCount = await databaseSelect.getByRole('option').count();
  expect(dbOptionsCount).toBeGreaterThan(0);

  const tableSelect = panelEditPage.getQueryEditorRow('A').getByLabel('Table');
  await expect(tableSelect).toBeVisible();
  await tableSelect.click();
  const optionsCount = await tableSelect.getByRole('option').count();
  expect(optionsCount).toBeGreaterThan(0);
});

test('query editor: should preview SQL query', async ({ panelEditPage, readProvisionedDataSource }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);

  await panelEditPage.getQueryEditorRow('A').getByLabel('Database').click();
  await panelEditPage.getQueryEditorRow('A').getByRole('option').first().click();

  await panelEditPage.getQueryEditorRow('A').getByLabel('Table').click();
  await panelEditPage.getQueryEditorRow('A').getByRole('option').first().click();

  const addColumnBtn = panelEditPage.getQueryEditorRow('A').getByRole('button', { name: /add column/i });
  await addColumnBtn.click();

  const preview = panelEditPage.getQueryEditorRow('A').getByText(/^SELECT/);
  await expect(preview).toBeVisible();
});
