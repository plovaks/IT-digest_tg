import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './InviteAccept.css'
export default function InviteAccept() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState(null); // 'accepted' | 'declined'

  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const accessToken = localStorage.getItem('access_token');
        const headers = { 'Content-Type': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        const response = await fetch(
          `https://ritmevents.ru/api/v1/assistants/invite/${token}`,
          { method: 'GET', headers }
        );

        if (response.ok) {
          const data = await response.json();
          setOwnerInfo(data);
        } else if (response.status === 404) {
          setError('Приглашение не найдено');
        } else if (response.status === 410) {
          setError('Срок действия приглашения истёк');
        } else {
          setError('Ошибка при загрузке приглашения');
        }
      } catch (err) {
        setError('Ошибка подключения к серверу');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchPreview();
  }, [token]);

  const closeApp = () => {
    setTimeout(() => {
      if (tg) tg.close();
    }, 2000);
  };

  const acceptInvite = async () => {
    setAccepting(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        setError('Необходима авторизация');
        return;
      }

      const response = await fetch(
        `https://ritmevents.ru/api/v1/assistants/invite/${token}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setResult('accepted');
        closeApp();
      } else if (response.status === 409) {
        setError('Вы уже являетесь помощником этого пользователя');
      } else if (response.status === 410) {
        setError('Срок действия приглашения истёк');
      } else {
        setError('Ошибка при принятии приглашения');
      }
    } catch (err) {
      setError('Не удалось подключиться к серверу');
    } finally {
      setAccepting(false);
    }
  };

  const declineInvite = () => {
    setResult('declined');
    closeApp();
  };

  // Экран результата
  if (result) {
    return (
      <div className="invite-page">
        <div className="invite-result">
          {/* <div className={`result-icon ${result === 'accepted' ? 'result-icon--success' : 'result-icon--decline'}`}> */}
           
          {/* </div> */}
          <h2>{result === 'accepted' ? 'Приглашение принято!' : 'Приглашение отклонено'}</h2>
          <p>{result === 'accepted'
            ? 'Теперь вы можете управлять календарём пользователя'
            : 'Вы отклонили приглашение'}
          </p>
          <p className="closing-hint">Окно закроется автоматически...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="invite-page">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-page">
        <div className="error-container">
          <h3>Ошибка</h3>
          <p>{error}</p>
          <button onClick={() => tg ? tg.close() : window.close()} className="back-btn">
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <div className="invite-card">
        <h2>Приглашение</h2>

        {ownerInfo && (
          <div className="owner-info">
            {/* <div className="owner-avatar">
              {ownerInfo.owner_name?.charAt(0)?.toUpperCase() || '?'}
            </div> */}
            <div className="owner-details">
              {/* <p className="owner-name">{ownerInfo.owner_name || 'Пользователь'}</p> */}
              
              {ownerInfo.owner_username && (
                <span>Пользователь @{ownerInfo.owner_username}</span>
              )}
            </div>
          </div>
        )}

        <p className="invite-text">предлагает вам управлять его календарём мероприятий</p>

        {/* {ownerInfo?.expires_at && (
          <p className="expires-at">
            Действительно до: {new Date(ownerInfo.expires_at).toLocaleString()}
          </p>
        )} */}

        <div className="invite-actions">
          <button
            onClick={acceptInvite}
            className="accept-btn"
            disabled={accepting}
          >
            {accepting ? 'Принятие...' : 'Принять'}
          </button>
          <button onClick={declineInvite} className="cancel-btn">
            Отклонить
          </button>
        </div>
      </div>
    </div>
  );
}