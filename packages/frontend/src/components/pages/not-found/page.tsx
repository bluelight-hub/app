import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * NotFoundPage - 404 Error Page
 * Zeigt eine benutzerfreundliche Fehlermeldung an, wenn eine Seite nicht gefunden wird
 */
const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Entschuldigung, die gesuchte Seite existiert nicht."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Zurück zur Startseite
        </Button>
      }
    />
  );
};

export default NotFoundPage;
