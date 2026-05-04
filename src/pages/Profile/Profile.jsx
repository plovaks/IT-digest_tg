import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import './Profile.css';

import { CITIES, CATEGORIES, EVENT_TYPES, PARTICIPATION_TYPES } from "../../data/filters.js";

import dateIcon from "../../assets/icons/DateRange.svg";
import timeIcon from "../../assets/icons/time.svg";
import priceIcon from "../../assets/icons/currency.svg";
import placeIcon from "../../assets/icons/Place.svg";

export function Profile() {
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('myFilters');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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

  if (error) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="profile-retry-btn">
            Попробовать снова
          </button>
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
          >
            {tab === 'myFilters' ? 'Мои фильтры'
              : tab === 'myCalendars' ? 'Календари'
              : tab === 'myEvents' ? 'Мои события'
              : 'Помощники'}
          </button>
        ))}
      </div>

      <div className="profile__tabs-content">

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
              <div className="chips-container">
                {CATEGORIES.map((item, i) => (
                  <button key={i} className={`chip ${filters.categories.includes(item) ? 'chip-active' : ''}`} onClick={() => toggleChip('categories', item)}>
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
              <div className="chips-container">
                {CITIES.map((item, i) => (
                  <button key={i} className={`chip ${filters.cities.includes(item) ? 'chip-active' : ''}`} onClick={() => toggleChip('cities', item)}>
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
              <div className="chips-container">
                {EVENT_TYPES.map((item, i) => (
                  <button key={i} className={`chip ${filters.eventTypes.includes(item) ? 'chip-active' : ''}`} onClick={() => toggleChip('eventTypes', item)}>
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
              <div className="chips-container">
                {PARTICIPATION_TYPES.map((item, i) => (
                  <button key={i} className={`chip ${filters.participationTypes.includes(item) ? 'chip-active' : ''}`} onClick={() => toggleChip('participationTypes', item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

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
            <h3 className="profile-section-title">Подключённые календари</h3>
            {loadingExtra.calendars ? (
              <div className="profile-loading-small">
                <div className="spinner-small"></div>
                <p>Загрузка...</p>
              </div>
            ) : calendars.length > 0 ? (
              <div className="profile-calendars-list">
                {calendars.map((calendar) => (
                  <div key={calendar.id} className="profile-calendar-item">
                    <span className="calendar-provider">
                      {calendar.provider === 'google' ? 'Google Календарь' : 'Яндекс Календарь'}
                    </span>
                    <button 
                      className="calendar-delete-btn"
                      onClick={() => deleteCalendar(calendar.provider)}
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-empty-value">Нет подключенных календарей</p>
            )}
          </div>
        )}

        
        {activeTab === 'myEvents' && (
          <div className="profile__events-section">
            <h3 className="profile-section-title">Мои события</h3>
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
                      <Link to={`/events/${event.id}`} className="digest__link">
                        <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="profile-empty-events">
                <p className="profile-empty-value">Нет предстоящих событий в календаре</p>
                <p className="profile-empty-hint">
                  События, которые вы добавили в календарь и которые ещё не прошли, появятся здесь
                </p>
              </div>
            )}
          </div>
        )}

        
        {activeTab === 'myHelpers' && (
          <div className="profile__helpers-section">
            <h3 className="profile-section-title">Помощники</h3>
            {loadingExtra.assistants ? (
              <div className="profile-loading-small"><div className="spinner-small"></div><p>Загрузка...</p></div>
            ) : assistants.length > 0 ? (
              <div className="profile-assistants-list">
                {assistants.map((assistant, idx) => (
                  <div key={idx} className="profile-assistant-item">
                    <span className="assistant-name">{assistant.username}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-empty-value">Нет добавленных помощников</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}