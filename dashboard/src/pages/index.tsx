import { LoadingScreen } from '@/components/common/LoadingScreen';
import MaintenanceAlert from '@/components/common/MaintenanceAlert';
import { Sidebar } from '@/components/home/Sidebar';
import { WorkspaceAndProjectList } from '@/components/home/WorkspaceAndProjectList';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import Container from '@/components/layout/Container';
import Box from '@/ui/v2/Box';
import Button from '@/ui/v2/Button';
import Text from '@/ui/v2/Text';
import { useGetAllWorkspacesAndProjectsQuery } from '@/utils/__generated__/graphql';
import { darken } from '@mui/system';
import { useUserData } from '@nhost/nextjs';
import NavLink from 'next/link';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

export default function IndexPage() {
  const user = useUserData();
  const { data, loading, startPolling, stopPolling } =
    useGetAllWorkspacesAndProjectsQuery({
      skip: !user,
    });

  const numberOfProjects = data?.workspaces.reduce(
    (projectCount, currentWorkspace) =>
      projectCount + currentWorkspace.projects.length,
    0,
  );

  // keep polling for workspaces until there is a workspace available.
  // We do this because when a user signs up a workspace is created automatically
  // and the serverless function can take some time to complete.
  useEffect(() => {
    startPolling(1000);
  }, [startPolling]);

  useEffect(() => {
    if (!data?.workspaces.length) {
      return;
    }

    stopPolling();
  }, [data?.workspaces, stopPolling]);

  if ((!data && loading) || !user) {
    return <LoadingScreen />;
  }

  if (numberOfProjects === 0) {
    return (
      <Container className="grid grid-cols-1 gap-8 md:grid-cols-4 md:pt-8">
        <Box className="noapps col-span-1 h-80 rounded-md text-center md:col-span-3">
          <div className="pt-12">
            <Text
              className="text-center text-2xl font-semibold"
              sx={{ color: 'common.white' }}
            >
              Welcome to Nhost!
            </Text>

            <Text className="mt-2" sx={{ color: 'common.white' }}>
              Let&apos;s set up your first backend - the Nhost way.
            </Text>

            <div className="inline-block pt-10">
              <NavLink href="/new" passHref>
                <Button
                  sx={{
                    backgroundColor: (theme) =>
                      `${theme.palette.common.white} !important`,
                    color: (theme) =>
                      `${theme.palette.common.black} !important`,
                    '&:hover': {
                      backgroundColor: (theme) =>
                        `${darken(theme.palette.common.white, 0.1)} !important`,
                    },
                  }}
                  disabled={data?.workspaces?.length === 0}
                >
                  Create Your First Project
                </Button>
              </NavLink>
            </div>
            <div>
              <Text className="mt-9 opacity-70" sx={{ color: 'common.white' }}>
                Looking for your old apps? They&apos;re still on
                console.nhost.io during this beta.
              </Text>
            </div>
          </div>
        </Box>

        <Sidebar workspaces={data?.workspaces || []} />
      </Container>
    );
  }

  return (
    <Container className="grid grid-cols-1 gap-8 md:grid-cols-4">
      <WorkspaceAndProjectList
        workspaces={data?.workspaces || []}
        className="col-span-1 md:col-span-3"
      />

      <Sidebar workspaces={data?.workspaces || []} />
    </Container>
  );
}

IndexPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <AuthenticatedLayout
      title="Dashboard"
      contentContainerProps={{ className: 'flex w-full flex-col px-4' }}
    >
      <Container className="py-0">
        <MaintenanceAlert />
      </Container>

      {page}
    </AuthenticatedLayout>
  );
};
