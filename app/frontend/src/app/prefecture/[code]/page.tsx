import PrefecturePage from '@/pages/PrefecturePage';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function Page({ params }: Props) {
  const { code } = await params;
  return <PrefecturePage code={code} />;
}
