import { Button } from 'antd';
import { useNavigate } from 'react-router';

const IndexPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen">
      <Button onClick={() => navigate('/app')}>Anmelden</Button>
    </div>
  );
};

export default IndexPage;
