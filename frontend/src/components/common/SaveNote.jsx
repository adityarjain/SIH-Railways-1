import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { AdvisoryNote } from '../ui/worksheet';

/**
 * Says truthfully where the user's actions go: the shared operations log when
 * the API is running, or this browser tab only when it is not.
 */
export const SaveNote = ({ action }) => {
  const { mode } = useAuth();
  const { t } = useI18n();
  const api = mode === 'api';
  return (
    <AdvisoryNote tone={api ? 'info' : 'warn'} title={t(api ? 'save.apiTitle' : 'save.localTitle')} action={action}>
      {t(api ? 'save.apiBody' : 'save.localBody')}
    </AdvisoryNote>
  );
};
