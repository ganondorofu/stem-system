'use client';

import { Button } from '@/components/ui/button';
import { handleConsent } from './actions';
import { useFormStatus } from 'react-dom';

function SubmitButtons() {
  const { pending } = useFormStatus();

  return (
    <>
      <Button
        type="submit"
        name="action"
        value="approve"
        className="w-full"
        disabled={pending}
      >
        {pending ? '処理中...' : '承認する'}
      </Button>
      <Button
        type="submit"
        name="action"
        value="deny"
        variant="outline"
        className="w-full"
        disabled={pending}
      >
        キャンセル
      </Button>
    </>
  );
}

export function ConsentForm({
  clientId,
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
  scope,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
}) {
  return (
    <form action={handleConsent} className="space-y-3">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="redirect_uri" value={redirectUri} />
      <input type="hidden" name="state" value={state} />
      <input type="hidden" name="code_challenge" value={codeChallenge} />
      <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />
      <input type="hidden" name="scope" value={scope} />
      <SubmitButtons />
    </form>
  );
}
