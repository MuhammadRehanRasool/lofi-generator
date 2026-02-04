import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout/Layout';
import RandomGenerator from './pages/RandomGenerator';
import YouTubeConverter from './pages/YouTubeConverter';
import OutputManager from './pages/OutputManager';
import Finalize from './pages/Finalize';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/random" replace />} />
            <Route path="random" element={<RandomGenerator />} />
            <Route path="youtube" element={<YouTubeConverter />} />
            <Route path="output" element={<OutputManager />} />
            <Route path="finalize" element={<Finalize />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
