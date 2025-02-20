import type {
  BaseRoleFormProps,
  BaseRoleFormValues,
} from '@/components/settings/roles/BaseRoleForm';
import BaseRoleForm, {
  baseRoleFormValidationSchema,
} from '@/components/settings/roles/BaseRoleForm';
import { useCurrentWorkspaceAndProject } from '@/hooks/v2/useCurrentWorkspaceAndProject';
import ActivityIndicator from '@/ui/v2/ActivityIndicator';
import {
  GetRolesPermissionsDocument,
  useGetRolesPermissionsQuery,
  useUpdateConfigMutation,
} from '@/utils/__generated__/graphql';
import getServerError from '@/utils/settings/getServerError';
import getUserRoles from '@/utils/settings/getUserRoles';
import { getToastStyleProps } from '@/utils/settings/settingsConstants';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormProvider, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export interface CreateRoleFormProps
  extends Pick<BaseRoleFormProps, 'onCancel' | 'location'> {
  /**
   * Function to be called when the form is submitted.
   */
  onSubmit?: () => Promise<void>;
}

export default function CreateRoleForm({
  onSubmit,
  ...props
}: CreateRoleFormProps) {
  const { currentProject } = useCurrentWorkspaceAndProject();
  const { data, loading, error } = useGetRolesPermissionsQuery({
    variables: { appId: currentProject?.id },
    fetchPolicy: 'cache-only',
  });
  const { allowed: allowedRoles } = data?.config?.auth?.user?.roles || {};

  const form = useForm<BaseRoleFormValues>({
    defaultValues: {},
    reValidateMode: 'onSubmit',
    resolver: yupResolver(baseRoleFormValidationSchema),
  });

  const [updateConfig] = useUpdateConfigMutation({
    refetchQueries: [GetRolesPermissionsDocument],
  });

  if (loading) {
    return <ActivityIndicator delay={1000} label="Loading roles..." />;
  }

  if (error) {
    throw error;
  }

  const { setError } = form;
  const availableRoles = getUserRoles(allowedRoles);

  async function handleSubmit({ name }: BaseRoleFormValues) {
    if (availableRoles.some((role) => role.name === name)) {
      setError('name', { message: 'This role already exists.' });

      return;
    }

    const updatedAllowedRoles = allowedRoles ? [...allowedRoles, name] : [name];

    const updateConfigPromise = updateConfig({
      variables: {
        appId: currentProject?.id,
        config: {
          auth: {
            user: {
              roles: {
                allowed: updatedAllowedRoles,
              },
            },
          },
        },
      },
    });

    try {
      await toast.promise(
        updateConfigPromise,
        {
          loading: 'Creating role...',
          success: 'Role has been created successfully.',
          error: getServerError(
            'An error occurred while trying to create the role.',
          ),
        },
        getToastStyleProps(),
      );

      onSubmit?.();
    } catch (updateConfigError) {
      console.error(updateConfigError);
    }
  }

  return (
    <FormProvider {...form}>
      <BaseRoleForm submitButtonText="Add" onSubmit={handleSubmit} {...props} />
    </FormProvider>
  );
}
