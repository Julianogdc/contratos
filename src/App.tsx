import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { ClientContractView } from './pages/ClientContractView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/c/:id" element={<ClientContractView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
