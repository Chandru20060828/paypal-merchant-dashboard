import { useData } from '../context/DataContext.jsx';
import { Spinner, ErrorBox, PageHeader, RangeSelect, DataBanner } from '../components/ui.jsx';
import InsightsPanel from '../components/InsightsPanel.jsx';
import ChatAssistant from '../components/ChatAssistant.jsx';
import { NoData } from './Overview.jsx';

export default function AIInsights() {
  const { data, loading, error, reload } = useData();
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  return (
    <>
      <PageHeader title="AI Insights" subtitle="Ask questions and get answers backed by your own numbers."><RangeSelect /></PageHeader>
      {!data || data.empty ? <NoData onLoaded={reload} /> : (
        <><DataBanner sources={data.sources} /><div className="grid gap-4 xl:grid-cols-2"><InsightsPanel insights={data.insights} /><ChatAssistant tall /></div></>
      )}
    </>
  );
}
