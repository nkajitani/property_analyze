import CityPage from '@/pages/CityPage';

export default async function Page({
  params,
}: {
  params: Promise<{ code: string; city_code: string }>;
}) {
  const { city_code } = await params;
  return <CityPage cityCode={city_code} />;
}
