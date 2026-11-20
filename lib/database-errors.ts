/** Business version conflicts must not use retryable SQLSTATE 40001 in RPCs.
 * Accept the legacy code during rolling deployments of the database migration.
 */
export function isVersionConflict(error: { code?: string }): boolean {
  return error.code === "PT409" || error.code === "40001";
}
