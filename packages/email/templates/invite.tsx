import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

type InviteTemplateProps = {
  readonly storeName: string;
  readonly url: string;
};

export const InviteTemplate = ({ storeName, url }: InviteTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>You have been invited to the {storeName} dashboard</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="rounded-md bg-white p-8">
            <Text className="mt-0 mb-4 font-semibold text-xl text-zinc-900">
              You have been invited to {storeName}
            </Text>
            <Text className="m-0 text-zinc-600">
              Someone invited you to help manage the {storeName} store. Use the
              button below to create your account.
            </Text>
            <Button
              className="mt-6 rounded-md bg-zinc-900 px-5 py-3 font-medium text-white"
              href={url}
            >
              Accept invitation
            </Button>
            <Hr className="my-6 border-zinc-200" />
            <Text className="m-0 text-xs text-zinc-500">
              If the button does not work, paste this link into your browser:
            </Text>
            <Text className="m-0 break-all text-xs text-zinc-500">{url}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default InviteTemplate;
