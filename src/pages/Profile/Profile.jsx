import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import './Profile.css';
import Filters from "../../components/Filters/Filters.jsx";
import { CITIES, CATEGORIES, EVENT_TYPES, PARTICIPATION_TYPES } from "../../data/filters.js";

import dateIcon from "../../assets/icons/DateRange.svg";
import timeIcon from "../../assets/icons/time.svg";
import priceIcon from "../../assets/icons/currency.svg";
import placeIcon from "../../assets/icons/Place.svg";
import partType from "../../assets/icons/partType.svg"

export function Profile() {
  // Только нужные состояния для помощников
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [showFilterSuccessModal, setShowFilterSuccessModal] = useState(false);
const [showCopySuccessModal, setShowCopySuccessModal] = useState(false);
const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  // Остальные состояния
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('myFilters');
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    cities: [],
    categories: [],
    eventTypes: [],
    participationTypes: []
  });

  const [assistants, setAssistants] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]); 
  
  const availableCalendars = [
    { id: 'google', name: 'Google Календарь' },
    { id: 'yandex', name: 'Яндекс Календарь' }
  ];
  
  const [loadingExtra, setLoadingExtra] = useState({
    assistants: true,
    submissions: true,
    calendars: true,
    calendarEvents: true
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return dateString.split('-').reverse().join('.');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const isUpcomingEvent = (eventDate) => {
    if (!eventDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDateObj = new Date(eventDate);
    eventDateObj.setHours(0, 0, 0, 0);
    return eventDateObj >= today;
  };

  const openLink = (url) => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // функция для подключения календарей
  const connectCalendar = async (provider) => {
    if (!token) {
      setError('Необходима авторизация');
      return;
    }

    setIsConnectingCalendar(true);
    setError(null);

    try {
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
      
      if (data.oauth_url) {
        openLink(data.oauth_url);
        
        setTimeout(() => {
          if (userData) {
            fetchAllExtraData(userData.id);
          }
        }, 5000);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err.message);
    } finally {
      setIsConnectingCalendar(false);
    }
  };

const applyFilters = async () => {
  if (!token || !userData) return;
  
  try {
    await saveFiltersToServer(filters);
    setShowFilterSuccessModal(true);
    setTimeout(() => setShowFilterSuccessModal(false), 1500);
  } catch (error) {
    console.error('Ошибка:', error);
    setError('Не удалось сохранить фильтры');
    setTimeout(() => setError(null), 3000);
  }
};

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      setToken(accessToken);
    } else {
      setIsLoading(false);
      setError('Не найден токен авторизации');
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('https://ritmevents.ru/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          
          const newFilters = {
            cities: data.city ? data.city.split(',').map(c => c.trim()).filter(c => c && c !== 'string') : [],
            categories: data.track ? data.track.split(',').map(t => t.trim()).filter(t => t && t !== 'string') : [],
            eventTypes: data.preferred_event_types ? data.preferred_event_types.split(',').map(e => e.trim()).filter(e => e && e !== 'string') : [],
            participationTypes: data.preferred_participation_types ? data.preferred_participation_types.split(',').map(p => p.trim()).filter(p => p && p !== 'string') : []
          };
          setFilters(newFilters);
          await fetchAllExtraData(data.id);
        } else if (response.status === 401) {
          localStorage.removeItem('access_token');
          setError('Сессия истекла. Пожалуйста, войдите снова');
        }
      } catch (err) {
        console.error('Ошибка при запросе:', err);
        setError('Не удалось подключиться к серверу');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [token]);







  const saveFiltersToServer = async (newFilters) => {
    if (!token || !userData) return;
    try {
      const payload = {
        city: newFilters.cities.join(','),
        track: newFilters.categories.join(','),
        preferred_event_types: newFilters.eventTypes.join(','),
        preferred_participation_types: newFilters.participationTypes.join(',')
      };
      await fetch(`https://ritmevents.ru/api/v1/users/${userData.id}/filters`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Ошибка сохранения фильтров:', error);
    }
  };

  const toggleChip = (section, value) => {
    const current = filters[section];
    const updated = {
      ...filters,
      [section]: current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
    };
    setFilters(updated);
    saveFiltersToServer(updated);
  };

  const toggleAll = (section, allValues) => {
    const updated = {
      ...filters,
      [section]: filters[section].length === allValues.length ? [] : [...allValues]
    };
    setFilters(updated);
    saveFiltersToServer(updated);
  };

  // Удаление помощника
const deleteHelper = async (assistantId) => {
  if (!token || !userData) return;

  try {
    const response = await fetch(
      `https://ritmevents.ru/api/v1/users/${userData.id}/assistants/${assistantId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 204 || response.ok) {
      setAssistants(prev => prev.filter(assistant => assistant.id !== assistantId));
      setShowDeleteSuccessModal(true);
      setTimeout(() => setShowDeleteSuccessModal(false), 1500);
    } else if (response.status === 404) {
      setError("Помощник не найден");
      setTimeout(() => setError(null), 3000);
    } else {
      throw new Error("Ошибка при удалении");
    }
  } catch (err) {
    console.error('Ошибка:', err);
    setError("Не удалось удалить помощника");
    setTimeout(() => setError(null), 3000);
  }
};


// Создание инвайт-ссылки
const createInviteLink = async () => {
  console.log('[createInviteLink] Starting...');
  if (!token) {
    console.log('[createInviteLink] No token');
    setError("Необходима авторизация");
    return;
  }

  setIsCreatingInvite(true);
  setError(null);

  try {
    console.log('[createInviteLink] Sending POST to /api/v1/assistants/invite');
    const response = await fetch('https://ritmevents.ru/api/v1/assistants/invite', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[createInviteLink] Response status:', response.status);
    
    const responseText = await response.text();
    console.log('[createInviteLink] Response body:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      
      
      
      const inviteUrl = `https://t.me/sber_events_agg_bot?startapp=invite_${data.token}`;
      
      
      console.log('[createInviteLink] Invite URL (GitHub Pages):', inviteUrl);
      
      setInviteLink({
        ...data,
        invite_url: inviteUrl
      });
      setShowInviteModal(true);
    } else {
      console.log('[createInviteLink] Error:', response.status);
      setError("Ошибка создания приглашения");
      setTimeout(() => setError(null), 3000);
    }
  } catch (err) {
    console.error('[createInviteLink] Network error:', err);
    setError("Не удалось создать приглашение");
    setTimeout(() => setError(null), 3000);
  } finally {
    setIsCreatingInvite(false);
  }
};

  // Копирование ссылки в буфер обмена
const copyInviteLink = () => {
  if (inviteLink?.invite_url) {
    navigator.clipboard.writeText(inviteLink.invite_url);
    setShowCopySuccessModal(true);
    setTimeout(() => setShowCopySuccessModal(false), 1500);
  }
};

  // Отзыв инвайт-ссылки
  const revokeInviteLink = async () => {
    if (!inviteLink?.token) return;

    try {
      const response = await fetch(`https://ritmevents.ru/api/v1/assistants/invite/${inviteLink.token}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 204 || response.ok) {
        setInviteLink(null);
        setShowInviteModal(false);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 1500);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setError("Не удалось отозвать приглашение");
      setTimeout(() => setError(null), 3000);
    }
  };

  const fetchAllExtraData = async (userId) => {
    const fetchOne = async (url, dataType, setState) => {
      try {
        setLoadingExtra(prev => ({ ...prev, [dataType]: true }));
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setState(data);
        } else {
          setState([]);
        }
      } catch (err) {
        console.error(`Ошибка загрузки ${dataType}:`, err);
        setState([]);
      } finally {
        setLoadingExtra(prev => ({ ...prev, [dataType]: false }));
      }
    };

    const fetchCalendarEvents = async () => {
      try {
        setLoadingExtra(prev => ({ ...prev, calendarEvents: true }));
        const response = await fetch(
          `https://ritmevents.ru/api/v1/users/${userId}/calendar-events`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setCalendarEvents(data);

          const futureEventsList = [];
          
          await Promise.all(
            data.map(async (item) => {
              try {
                const res = await fetch(
                  `https://ritmevents.ru/api/v1/events/${item.event_id}`,
                  { 
                    headers: { 'Authorization': `Bearer ${token}` },
                    mode: 'cors'
                  }
                );
                if (res.ok) {
                  const eventData = await res.json();
                  
                  if (eventData.start_date && isUpcomingEvent(eventData.start_date)) {
                    futureEventsList.push({
                      id: item.id,
                      event_id: item.event_id,
                      provider: item.provider,
                      eventDetails: eventData
                    });
                  }
                } else if (res.status === 401) {
                  console.error('Токен недействителен');
                  localStorage.removeItem('access_token');
                }
              } catch (e) {
                console.error(`Ошибка загрузки события ${item.event_id}:`, e);
              }
            })
          );
          
          futureEventsList.sort((a, b) => {
            const dateA = new Date(a.eventDetails.start_date);
            const dateB = new Date(b.eventDetails.start_date);
            return dateA - dateB;
          });
          
          setUpcomingEvents(futureEventsList);
        } else {
          setCalendarEvents([]);
          setUpcomingEvents([]);
        }
      } catch (err) {
        console.error('Ошибка загрузки событий календаря:', err);
        setCalendarEvents([]);
        setUpcomingEvents([]);
      } finally {
        setLoadingExtra(prev => ({ ...prev, calendarEvents: false }));
      }
    };

    await Promise.all([
      fetchOne(`https://ritmevents.ru/api/v1/users/${userId}/assistants`, 'assistants', setAssistants),
      fetchOne(`https://ritmevents.ru/api/v1/users/${userId}/submissions`, 'submissions', setSubmissions),
      fetchOne(`https://ritmevents.ru/api/v1/users/${userId}/calendars`, 'calendars', setCalendars),
      fetchCalendarEvents(),
    ]);
  };

  const deleteCalendar = async (provider) => {
    if (!token) return;
    
    const calendarExists = calendars.some(cal => cal.provider === provider);
    if (!calendarExists) {
      console.log(`Календарь ${provider} не найден в списке`);
      await fetchAllExtraData(userData.id);
      return;
    }
    
    const providerName = provider === 'google' ? 'google' : 
                         provider === 'yandex' ? 'yandex' : provider;
    
    try {
      const response = await fetch(
        `https://ritmevents.ru/api/v1/calendars/${providerName}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 204 || response.ok) {
        setCalendars(prev => prev.filter(cal => cal.provider !== provider));
        setCalendarEvents(prev => prev.filter(event => event.provider !== provider));
        setUpcomingEvents(prev => prev.filter(event => event.provider !== provider));
        console.log(`Календарь ${providerName} успешно удалён`);
      } else if (response.status === 404) {
        console.log(`Календарь ${providerName} не найден на сервере`);
        await fetchAllExtraData(userData.id);
      } else if (response.status === 401) {
        localStorage.removeItem('access_token');
        setError('Сессия истекла. Пожалуйста, войдите снова');
      } else {
        console.error('Ошибка удаления календаря:', response.status);
      }
    } catch (err) {
      console.error('Ошибка при удалении календаря:', err);
    }
  };
  
  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return <div className="profile-container"><div className="profile-empty"></div></div>;
  }

  return (
    <div className="profile-container">
      <div className="profileTabs">
        {['myFilters', 'myCalendars', 'myEvents', 'myHelpers'].map((tab) => (
          <button
            key={tab}
            className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{color: '#000000'}}
          >
            {tab === 'myFilters' ? 'Мои фильтры'
              : tab === 'myCalendars' ? 'Календари'
              : tab === 'myEvents' ? 'Мои события'
              : 'Помощники'}
          </button>
        ))}
      </div>

      <div className="profile__tabs-content">
         {showFilterSuccessModal && (
            <div className="filter-success-modal">
              <div className="filter-success-content">
                <p>Фильтры сохранены!</p>
              </div>
            </div>
          )}
          {showDeleteSuccessModal && (
  <div className="filter-success-modal">
    <div className="filter-success-content">
      <p>Помощник удалён</p>
    </div>
  </div>
)}

{showCopySuccessModal && (
  <div className="filter-success-modal">
    <div className="filter-success-content">
      <p>Ссылка скопирована!</p>
    </div>
  </div>
)}
        
        {/* фильтры */}
        {activeTab === 'myFilters' && (
          <div className="profile__filters-section">
            <div className="filter-section">
              <div className="filter-section-header">
                <h3 className="filter-section__title">Категории</h3>
                <button className="filter-section--chooseAll" onClick={() => toggleAll('categories', CATEGORIES)}>
                  {filters.categories.length === CATEGORIES.length ? 'Очистить все' : 'Выбрать все'}
                </button>
              </div>
              <div className="profile_chips-container">
                {CATEGORIES.map((item, i) => (
                  <button key={i} className={`profile_chip ${filters.categories.includes(item) ? 'profile_chip-active' : ''}`} onClick={() => toggleChip('categories', item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-section-header">
                <h3 className="filter-section__title">Город</h3>
                <button className="filter-section--chooseAll" onClick={() => toggleAll('cities', CITIES)}>
                  {filters.cities.length === CITIES.length ? 'Очистить все' : 'Выбрать все'}
                </button>
              </div>
              <div className="profile_chips-container">
                {CITIES.map((item, i) => (
                  <button key={i} className={`profile_chip ${filters.cities.includes(item) ? 'profile_chip-active' : ''}`} onClick={() => toggleChip('cities', item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-section-header">
                <h3 className="filter-section__title">Тип мероприятия</h3>
                <button className="filter-section--chooseAll" onClick={() => toggleAll('eventTypes', EVENT_TYPES)}>
                  {filters.eventTypes.length === EVENT_TYPES.length ? 'Очистить все' : 'Выбрать все'}
                </button>
              </div>
              <div className="profile_chips-container">
                {EVENT_TYPES.map((item, i) => (
                  <button key={i} className={`profile_chip ${filters.eventTypes.includes(item) ? 'profile_chip-active' : ''}`} onClick={() => toggleChip('eventTypes', item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-section-header">
                <h3 className="filter-section__title">Тип участия</h3>
                <button className="filter-section--chooseAll" onClick={() => toggleAll('participationTypes', PARTICIPATION_TYPES)}>
                  {filters.participationTypes.length === PARTICIPATION_TYPES.length ? 'Очистить все' : 'Выбрать все'}
                </button>
              </div>
              <div className="profile_chips-container">
                {PARTICIPATION_TYPES.map((item, i) => (
                  <button key={i} className={`profile_chip ${filters.participationTypes.includes(item) ? 'profile_chip-active' : ''}`} onClick={() => toggleChip('participationTypes', item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <button
              className={`apply-filters__btn ${isSaving ? 'saving' : ''}`}
              onClick={applyFilters}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить фильтры'}
            </button>
            <button
              className="reset-filters__btn"
              onClick={() => {
                const empty = { cities: [], categories: [], eventTypes: [], participationTypes: [] };
                setFilters(empty);
                saveFiltersToServer(empty);
              }}
            >
              Сбросить всё
            </button>
          </div>
        )}

        {/* календари */}
        {activeTab === 'myCalendars' && (
          <div className="profile__calendars-section">
            <div className="calendar-subsection">
              {loadingExtra.calendars ? (
                <div className="profile-loading-small">
                  <div className="spinner-small"></div>
                  <p>Загрузка...</p>
                </div>
              ) : (
                <div className="all-calendars-list">
                  {availableCalendars.map((calendar) => {
                    const isConnected = calendars.some(cal => cal.provider === calendar.id);
                    
                    return (
                      <div key={calendar.id} className="calendar-item">
                        <div className="calendar-info">
                          <span className="calendar-name">{calendar.name}</span>
                        </div>
                        {isConnected ? (
                          <button 
                            className="calendar-delete-btn"
                            onClick={() => deleteCalendar(calendar.id)}
                          >
                            Удалить
                          </button>
                        ) : (
                          <button 
                            className="calendar-connect-btn"
                            onClick={() => connectCalendar(calendar.id)}
                            disabled={isConnectingCalendar}
                          >
                            {isConnectingCalendar ? 'Подключение...' : 'Подключить'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* мои события */}
        {activeTab === 'myEvents' && (
          <div className="profile__events-section">
            {loadingExtra.calendarEvents ? (
              <div className="profile-loading-small">
                <div className="spinner-small"></div>
                <p>Загрузка событий...</p>
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="profile-events-list">
                {upcomingEvents.map((item) => {
                  const event = item.eventDetails;
                  return (
                    <div key={item.id} className="profile-event-card">
                      {item.provider && (
                        <div className="calendar-badge">
                          {item.provider === 'google' ? 'Google Календарь' : 'Яндекс Календарь'}
                        </div>
                      )}
                      <div className="digest__header">
                        <p className="digest__type">{event.event_type?.join(', ')}</p>
                        <h3 className="digest__title">{event.title}</h3>
                      </div>
                      <div className="digest__mainInfo">
                        <div className="digest__date-row">
                          {event.start_date && (
                            <div className="digest__day">
                              <img src={dateIcon} alt="icon" /> {formatDate(event.start_date)}
                            </div>
                          )}
                          {event.start_time && (
                            <div className="digest__time">
                              <img src={timeIcon} alt="icon" /> {formatTime(event.start_time)}
                            </div>
                          )}
                        </div>
                        {typeof event.price === 'number' && (
                          <div className="digest__price">
                            <img src={priceIcon} alt="ruble icon" />
                            {event.price === 0 ? "Бесплатно" : event.price}
                          </div>
                        )}
                        {event.participation_type && (
                          <div className="event__partType">
                            <img src={partType} alt="person speaking icon"/> 
                            {event.participation_type}
                          </div>
                        )}
                        <div className="digest__location">
                          <img src={placeIcon} alt="icon" />
                          {event.city?.join(', ') || event.address || 'Онлайн'}
                        </div>
                      </div>
                      {event.tags && event.tags.length > 0 && (
                        <div className="digest__tags">
                          {event.tags.map((tag, index) => (
                            <span key={index} className="digest__tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                      <Link 
                        to={`/events/${event.id}`} 
                        className="digest__link"
                        state={{ 
                          token: token, 
                          userId: userData?.id, 
                          from: 'profile-events'  
                        }}
                      >
                        <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="profile-empty-events">
                {/* <p className="profile-empty-value">Нет предстоящих событий в календаре</p> */}
                <p className="profile-empty-hint">
                  События, которые вы добавили в календарь появятся здесь
                </p>
              </div>
            )}
          </div>
        )}

        {/* Помощники */}
        {activeTab === 'myHelpers' && (
          <div className="profile__helpers-section">
            <p className="helpers-description">
              Помощники могут самостоятельно добавлять события в твой календарь
            </p>
            
            <button 
              className="create-invite-btn"
              onClick={createInviteLink}
              disabled={isCreatingInvite}
            >
              {isCreatingInvite ? "Создание..." : "+ Создать ссылку-приглашение"}
            </button>
            
            {loadingExtra.assistants ? (
              <div className="profile-loading-small">
                <div className="spinner-small"></div>
                <p>Загрузка...</p>
              </div>
            ) : (
              <>
                {assistants.length > 0 ? (
                  <div className="profile-assistants-list">
                    {assistants.map((assistant) => (
                      <div key={assistant.id} className="profile-assistant-item">
                        <div className="assistant-info">
                          <span className="assistant-name">{assistant.username || `Помощник ${assistant.id}`}</span>
                          {/* {assistant.telegram_id && (
                            <span className="assistant-telegram-id">TG ID: {assistant.telegram_id}</span>
                          )} */}
                        </div>
                        <button 
                          className="assistant-delete-btn"
                          onClick={() => deleteHelper(assistant.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="profile-empty-value"></p>
                )}
              </>
            )}
            
            {/* Модальное окно с инвайт-ссылкой */}
            {showInviteModal && inviteLink && (
              <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Приглашение помощника</h3>
                  <p>Отправьте эту ссылку человеку, которого хотите добавить как помощника:</p>
                  <div className="invite-link-container">
                    <input 
                      type="text" 
                      readOnly 
                      value={inviteLink.invite_url} 
                      className="invite-link-input"
                    />
                    <button className="copy-link-btn" onClick={copyInviteLink}>
                      Копировать
                    </button>
                  </div>
                  {/* <p className="invite-expires">
                    Ссылка действительна до: {new Date(inviteLink.expires_at).toLocaleString()}
                  </p> */}
                  <div className="modal-actions">
                    <button className="modal-cancel-btn" onClick={() => setShowInviteModal(false)}>
                      Закрыть
                    </button>
                    <button className="modal-confirm-btn" onClick={revokeInviteLink}>
                      Отозвать ссылку
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}