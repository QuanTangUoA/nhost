import { useDialog } from '@/components/common/DialogProvider';
import { BillingPaymentMethodForm } from '@/components/workspace/BillingPaymentMethodForm';
import {
  refetchGetApplicationPlanQuery,
  useGetAppPlanAndGlobalPlansQuery,
  useGetPaymentMethodsQuery,
  useUpdateApplicationMutation,
} from '@/generated/graphql';
import { useCurrentWorkspaceAndProject } from '@/hooks/v2/useCurrentWorkspaceAndProject';
import ActivityIndicator from '@/ui/v2/ActivityIndicator';
import Box from '@/ui/v2/Box';
import Button from '@/ui/v2/Button';
import Checkbox from '@/ui/v2/Checkbox';
import { BaseDialog } from '@/ui/v2/Dialog';
import Text from '@/ui/v2/Text';
import { planDescriptions } from '@/utils/planDescriptions';
import getServerError from '@/utils/settings/getServerError/getServerError';
import { getToastStyleProps } from '@/utils/settings/settingsConstants';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

function Plan({
  planName,
  price,
  setPlan,
  planId,
  selectedPlanId,
  currentPlan,
}: any) {
  return (
    <button
      type="button"
      className="my-4 grid w-full grid-flow-col items-center justify-between gap-2 px-1"
      onClick={setPlan}
      tabIndex={-1}
    >
      <div className="grid grid-flow-row gap-y-0.5">
        <div className="grid grid-flow-col items-center justify-start gap-2">
          <Checkbox
            onChange={setPlan}
            checked={selectedPlanId === planId}
            aria-label={planName}
          />

          <Text
            variant="h3"
            component="p"
            className="self-center text-left font-medium"
          >
            {currentPlan.price > price ? 'Downgrade' : 'Upgrade'} to {planName}
          </Text>
        </div>

        <Text variant="subtitle2" className="w-full max-w-[256px] text-start">
          {planDescriptions[planName]}
        </Text>
      </div>

      <Text variant="h3" component="p">
        $ {price}/mo
      </Text>
    </button>
  );
}

export function ChangePlanModalWithData({ app, plans, close }: any) {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const { closeAlertDialog } = useDialog();

  const {
    currentWorkspace,
    currentProject,
    refetch: refetchWorkspaceAndProject,
  } = useCurrentWorkspaceAndProject();

  const { data } = useGetPaymentMethodsQuery({
    variables: {
      workspaceId: currentWorkspace?.id,
    },
    skip: !currentWorkspace,
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const paymentMethodAvailable = data?.paymentMethods.length > 0;

  const currentPlan = plans.find((plan) => plan.id === app.plan.id);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  const isDowngrade = currentPlan.price > selectedPlan?.price;

  const [updateApp] = useUpdateApplicationMutation({
    refetchQueries: [
      refetchGetApplicationPlanQuery({
        workspace: currentWorkspace.slug,
        slug: currentProject.slug,
      }),
    ],
  });

  const handleUpdateAppPlan = async () => {
    try {
      await toast.promise(
        updateApp({
          variables: {
            appId: app.id,
            app: {
              planId: selectedPlan.id,
            },
          },
        }),
        {
          loading: 'Updating plan...',
          success: `Plan has been updated successfully to ${selectedPlan.name}.`,
          error: getServerError(
            'An error occurred while updating the plan. Please try again.',
          ),
        },
        getToastStyleProps(),
      );

      await refetchWorkspaceAndProject();

      close?.();
      closeAlertDialog();
      setShowPaymentModal(false);
    } catch (error) {
      // Note: Error is handled by the toast.
    }
  };

  const handleChangePlanClick = async () => {
    if (!selectedPlan) {
      return;
    }

    if (!paymentMethodAvailable) {
      setShowPaymentModal(true);

      return;
    }

    await handleUpdateAppPlan();

    setShowPaymentModal(false);
    close?.();
    closeAlertDialog();
  };

  return (
    <Box className="w-full max-w-xl rounded-lg p-6 text-left">
      <BaseDialog
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      >
        <BillingPaymentMethodForm
          onPaymentMethodAdded={handleUpdateAppPlan}
          workspaceId={currentWorkspace.id}
        />
      </BaseDialog>

      <div className="flex flex-col">
        <div className="mx-auto">
          <Image
            src="/assets/upgrade.svg"
            alt="Nhost Logo"
            width={72}
            height={72}
          />
        </div>
        <Text variant="h3" component="h2" className="mt-2 text-center">
          Pick Your Plan
        </Text>
        <Text className="text-center">
          You&apos;re currently on the <strong>{app.plan.name}</strong> plan.
        </Text>

        <div className="mt-5">
          {plans
            .filter((plan) => plan.id !== app.plan.id)
            .map((plan) => (
              <div className="mt-4" key={plan.id}>
                <Plan
                  planName={plan.name}
                  currentPlan={currentPlan}
                  key={plan.id}
                  planId={plan.id}
                  selectedPlanId={selectedPlanId}
                  price={plan.price}
                  setPlan={() => setSelectedPlanId(plan.id)}
                />
              </div>
            ))}
        </div>

        <div className="mt-6 grid grid-flow-row gap-2">
          <Button onClick={handleChangePlanClick} disabled={!selectedPlan}>
            {!selectedPlan && 'Change Plan'}
            {selectedPlan && isDowngrade && 'Downgrade'}
            {selectedPlan && !isDowngrade && 'Upgrade'}
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              if (close) {
                close();
              }

              closeAlertDialog();
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Box>
  );
}

export interface ChangePlanModalProps {
  /**
   * Function to close the modal.
   */
  onCancel?: () => void;
}

export function ChangePlanModal({ onCancel }: ChangePlanModalProps) {
  const {
    query: { workspaceSlug, appSlug },
  } = useRouter();

  const { data, loading, error } = useGetAppPlanAndGlobalPlansQuery({
    variables: {
      workspaceSlug: workspaceSlug as string,
      appSlug: appSlug as string,
    },
    fetchPolicy: 'cache-first',
  });

  if (error) {
    throw error;
  }

  if (loading) {
    return (
      <ActivityIndicator delay={500} label="Loading plans..." className="m-8" />
    );
  }

  const { apps, plans } = data;
  const app = apps[0];

  return <ChangePlanModalWithData app={app} plans={plans} close={onCancel} />;
}
