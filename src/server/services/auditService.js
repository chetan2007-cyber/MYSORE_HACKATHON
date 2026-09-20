const AuditLog = require('../models/AuditLog');

/**
 * Log an audit entry for any critical state mutation
 */
const logAudit = async ({
  actor = null,
  actorName = 'System',
  actorRole = 'SYSTEM',
  action,
  entity,
  entityId,
  caseId = null,
  metadata = {},
  ipAddress = ''
}) => {
  try {
    await AuditLog.create({
      actor: actor?._id || actor || null,
      actorName: actor?.name || actorName,
      actorRole: actor?.role || actorRole,
      action,
      entity,
      entityId,
      caseId,
      metadata,
      ipAddress
    });
  } catch (error) {
    console.error(`[CivicTrack Audit Error]: ${error.message}`);
  }
};

module.exports = { logAudit };
