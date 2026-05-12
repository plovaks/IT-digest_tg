import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import currency from "../../assets/icons/currency.svg";
import date from "../../assets/icons/DateRange.svg";
import place from "../../assets/icons/Place.svg";
import time from "../../assets/icons/time.svg";
import partType from "../../assets/icons/partType.svg";
import webIcon from "../../assets/icons/web.svg";
import blueCalendar from "../../assets/icons/calendarBlue.svg";
import yandex from "../../assets/icons/Yandex.svg"
import google from "../../assets/icons/Google.svg"
import backIcon from "../../assets/icons/backArrow.svg"; 

import './Event.css';

export default function Event({ embeddedId, isPreview = false, status }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const id = embeddedId || paramId;

  const fromProfileEvents = location.state?.from === 'profile-events';
  const token = location.state?.token || localStorage.getItem('access_token');
  const userId = location.state?.userId || localStorage.getItem('user_id');
  
  // Получаем сохраненное состояние для возврата
  const returnState = {
    weekOffset: location.state?.weekOffset,
    page: location.state?.page,
    searchQuery: location.state?.searchQuery
  };

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Функция для возврата на дайджест с сохранением состояния
  const handleBack = () => {
    // Если есть состояние для возврата, передаем его
    if (returnState.weekOffset !== undefined || returnState.page !== undefined || returnState.searchQuery !== undefined) {
      navigate('/', { 
        state: {
          weekOffset: returnState.weekOffset,
          page: returnState.page,
          searchQuery: returnState.searchQuery
        }
      });
    } else {
      // Если нет состояния, просто возвращаемся назад
      navigate(-1);
    }
  };

  // Функция для форматирования строки времени
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  // Функция для получения статуса на русском
  const getStatusText = (statusValue) => {
    switch (statusValue) {
      case 'pending': return 'На модерации';
      case 'approved': return 'Одобрено';
      case 'rejected': return 'Отклонено';
      default: return statusValue;
    }
  };

  const getStatusClass = (statusValue) => {
    switch (statusValue) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) {
        setError('ID события не указан');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const eventId = Number(id);
        if (isNaN(eventId)) {
          setError('Некорректный ID события');
          setLoading(false);
          return;
        }

        const url = `https://ritmevents.ru/api/v1/events/${eventId}`;
        console.log('Fetching event from:', url);

        const response = await fetch(url, {
          headers: headers,
          method: 'GET'
        });

        console.log('Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Event data loaded');
          console.log('   event_url:', data.event_url);
          console.log('   registration_url:', data.registration_url);
          
          setEvent(data);
          if (activeTab === 'speakers' && !data.speakers?.length) setActiveTab('description');
          if (activeTab === 'organizers' && !data.organizers?.length) setActiveTab('description');
        } else if (response.status === 403 || response.status === 401) {
          setError('Необходима авторизация для просмотра события');
        } else if (response.status === 404) {
          setError(`Событие с ID ${eventId} не найдено`);
        } else {
          const errorText = await response.text();
          console.error('API error:', errorText);
          setError(`Ошибка ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.error('Ошибка при запросе события:', error);
        setError(`Ошибка соединения: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, token]);

  const openLink = (url) => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const waitForCalendarConnection = async (provider, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const response = await fetch(`https://ritmevents.ru/api/v1/users/${userId}/calendars`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const calendars = await response.json();
          const isConnected = calendars.some(cal => cal.provider === provider && cal.is_active === true);
          if (isConnected) {
            return true;
          }
        }
      } catch (error) {
        console.error('Ошибка проверки:', error);
      }
    }
    return false;
  };

  const checkCalendarConnected = async (provider) => {
    if (!token || !userId) return false;

    try {
      const response = await fetch(`https://ritmevents.ru/api/v1/users/${userId}/calendars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const calendars = await response.json();
        return calendars.some(cal => cal.provider === provider && cal.is_active === true);
      }
      return false;
    } catch (error) {
      console.error('Ошибка проверки календаря:', error);
      return false;
    }
  };

  const connectCalendar = async (provider) => {
    const response = await fetch('https://ritmevents.ru/api/v1/calendars/connect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка подключения: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.oauth_url;
  };

  const addEventToCalendar = async (provider) => {
    const response = await fetch(`https://ritmevents.ru/api/v1/events/${event.id}/add-to-calendar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка добавления: ${response.status} ${errorText}`);
    }

    return await response.json();
  };

  const handleAddToCalendar = async (provider) => {
    if (!token) {
      const tg = window.Telegram?.WebApp;
      tg?.showAlert('Необходимо авторизоваться');
      return;
    }

    if (!userId) {
      const tg = window.Telegram?.WebApp;
      tg?.showAlert('Ошибка: не удалось определить пользователя');
      return;
    }

    setIsProcessing(true);

    try {
      const isConnected = await checkCalendarConnected(provider);

      if (isConnected) {
        await addEventToCalendar(provider);
        const tg = window.Telegram?.WebApp;
        tg?.showAlert(`Событие добавлено в ${provider === 'google' ? 'Google' : 'Яндекс'} Календарь`);
        setAddToCalendar(false);
      } else {
        const oauthUrl = await connectCalendar(provider);
        openLink(oauthUrl);

        const tg = window.Telegram?.WebApp;

        const connected = await waitForCalendarConnection(provider);

        if (connected) {
          await addEventToCalendar(provider);
          tg?.showAlert(`Событие добавлено в ${provider === 'google' ? 'Google' : 'Яндекс'} Календарь`);
          setAddToCalendar(false);
        } else {
          tg?.showAlert('Не удалось подключить календарь. Попробуйте позже.');
        }
      }
    } catch (error) {
      console.error('Ошибка:', error);
      const tg = window.Telegram?.WebApp;
      tg?.showAlert(`Ошибка: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseSpeakerName = (speaker) => {
    const fullName = speaker.name || '';
    const hasDash = fullName.includes('-');
    if (hasDash) {
      const [name, description] = fullName.split('-');
      return { name: name.trim(), description: description.trim() };
    }
    return { name: fullName, description: null };
  };

  const handleOpenLink = (e, url) => {
    e.preventDefault();
    openLink(url);
  };

  if (loading) {
    return (
      <div className={`event ${isPreview ? 'event-preview' : ''}`}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка события...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`event ${isPreview ? 'event-preview' : ''}`}>
        <div className="event__not-found">
          <p>{error}</p>
          <button onClick={handleBack} className="back-to-digest-btn">
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`event ${isPreview ? 'event-preview' : ''}`}>
        <div className="event__not-found">
          Событие не найдено
          <button onClick={handleBack} className="back-to-digest-btn">
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`event ${isPreview ? 'event-preview' : ''}`}>
      {/* Кнопка возврата */}
      {/* <button onClick={handleBack} className="event-back-btn">
        Назад
      </button> */}

      {/* Блок статуса для режима предпросмотра (заявки) */}
      {isPreview && status && (
        <div className="event-status-banner">
          <span className={`status-badge ${getStatusClass(status)}`}>
            {getStatusText(status)}
          </span>
        </div>
      )}

      <div className="event__header">
        <p className="event__type">{event.event_type?.join(', ')}</p>
        <h1 className="event__title">{event.title}</h1>
      </div>

      <div className="event__info">
        <div className="event__mainInfo">
          <div className="event__date">
            <div className="event__day">
              {event.start_date && (
                <div className="event__dates">
                  <img src={date} alt="date icon" />
                  <time dateTime={event.start_date}>
                    {event.start_date.split('-').reverse().join('.')}
                  </time>
                  {event.end_date && event.end_date !== event.start_date && (
                    <>
                      <span> - </span>
                      <time dateTime={event.end_date}>
                        {event.end_date.split('-').reverse().join('.')}
                      </time>
                    </>
                  )}
                </div>
              )}
            </div>

            {event.start_time && (
              <div className="event__time">
                <img src={time} alt="time icon" />
                <time dateTime={event.start_time}>{formatTime(event.start_time)}</time>
                {event.end_time && (
                  <>
                    <span> - </span>
                    <time dateTime={event.end_time}>{formatTime(event.end_time)}</time>
                  </>
                )}
              </div>
            )}
          </div>

          {typeof event.price === 'number' && (
            <div className="event__price">
              <img src={currency} alt="price icon" />
              {event.price === 0 ? "Бесплатно" : `${event.price}`}
            </div>
          )}

          {event.participation_type && (
            <div className="event__partType">
              <img src={partType} alt="person speaking icon" />
              {event.participation_type?.join(', ')}
            </div>
          )}

          <div className="event__location">
            <img src={place} alt="place icon" />
            <span className="location__text">
              <span className="event__city">{event.city?.join(', ')}</span>
              {event.address && <span className="event__address">, {event.address}</span>}
            </span>
          </div>

          {event.event_url && (
            <div className="event__eventUrl">
              <img src={webIcon} alt="site icon" className="icon" />
              <a
                href={event.event_url}
                onClick={(e) => handleOpenLink(e, event.event_url)}
                className="event-link"
              >
                Сайт мероприятия
              </a>
            </div>
          )}

          <div className="event__tags">
            {event.tags?.map((tag, index) => (
              <span key={index} className="event__tag">#{tag}</span>
            ))}
          </div>
        </div>

        <div className="event__extraInfo">
          <div className="event__tabs">
            {[
              { key: 'description', label: 'Описание', show: true },
              { key: 'speakers', label: 'Спикеры', show: event.speakers?.length > 0 },
              { key: 'organizers', label: 'Организаторы', show: event.organizers?.length > 0 },
            ].filter(tab => tab.show).map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab__content">
            {activeTab === 'description' && (
              <div>
                <div className="event__description-tab">
                  <p className="description-text">{event.description}</p>
                </div>

                <div className="event__action" style={{ position: 'relative' }}>
                  {event.registration_url && (
                      <a
                        href={event.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          if (event.registration_url) {
                            handleOpenLink(e, event.registration_url);
                          }
                        }}
                        className="event-register--btn"
                      >
                        Регистрация
                      </a>
                    )}


                  {/* Кнопка "В календарь"  */}
                  {!isPreview && !fromProfileEvents && event.start_date && (
                    <div className="calendar-wrapper" style={{ paddingBottom: addToCalendar ? '110px' : '0' }}>
                      <button
                        onClick={() => setAddToCalendar(!addToCalendar)}
                        className="event-addToCalendar--btn"
                        disabled={isProcessing}
                      >
                        <img src={blueCalendar} alt='blue calendar icon' className="icon" />
                        {isProcessing ? 'Обработка...' : 'В календарь'}
                      </button>

                      {addToCalendar && (
                        <div className="calendar-dropdown">
                          <button onClick={() => handleAddToCalendar('google')} disabled={isProcessing} className="calendar--btn">
                            <img src={google} alt='google icon'/>
                            Google Календарь
                          </button>
                          <button onClick={() => handleAddToCalendar('yandex')} disabled={isProcessing} className="calendar--btn">
                            <img src={yandex} alt='yandex icon'/>
                            Яндекс Календарь
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'speakers' && (
              <div className="event__speakers-tab">
                {event.speakers?.map((speaker, index) => {
                  const { name, description } = parseSpeakerName(speaker);
                  return (
                    <div key={index}>
                      <span className="speaker__name">{name}</span>
                      {description && (
                        <>
                          <span> - </span>
                          <span className="speaker__desc">{description}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'organizers' && (
              <div className="event__organizers">
                <div className="organizers-list">
                  {event.organizers?.map((org, index) => (
                    org.url ? (
                      <a key={index} href={org.url} className="organizer-chip" onClick={(e) => handleOpenLink(e, org.url)}>
                        {org.name}
                      </a>
                    ) : (
                      <span key={index} className="organizer-chip organizer-chip--no-link">
                        {org.name}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}