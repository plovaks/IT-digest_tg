import React, { useState, useEffect, useCallback } from "react";
import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import './EventsDigest.css';
import { Link } from "react-router-dom";
import Filters from "../Filters/Filters";

import dateIcon from "../../assets/icons/DateRange.svg";
import timeIcon from "../../assets/icons/time.svg";
import priceIcon from "../../assets/icons/currency.svg";
import placeIcon from "../../assets/icons/Place.svg";
import arrowDown from "../../assets/icons/arrowDown.svg"
import closeIcon from "../../assets/icons/close.svg"

export default function EventsDigest({ filters, setFilters }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [code, setCode] = useState('');
  const [showInputCode, setShowInputCode] = useState(false);
  const [loginError, setLoginError] = useState('');

  const activeCount = Object.values(filters).flat().length;
  const hasFilters = activeCount > 0;

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return dateString.split('-').reverse().join('.');
  };

  
  const handleInvalidToken = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setIsLoggedIn(false);
    setIsAuthReady(false);
    setUserId(null);
    setShowInputCode(true);
  }, []);

  const saveFiltersToServer = useCallback(async (newFilters, authToken, userId) => {
    if (!authToken || !userId) return false;
    try {
      const payload = {
        city: newFilters.cities.join(','),
        track: newFilters.categories.join(','),
        preferred_event_types: newFilters.eventTypes.join(','),
        preferred_participation_types: newFilters.participationTypes.join(',')
      };
      const response = await fetch(`https://ritmevents.ru/api/v1/users/${userId}/filters`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) return true;
      if (response.status === 401) {
        handleInvalidToken();
      }
      return false;
    } catch (error) {
      console.log('error while saving filters: ', error);
      return false;
    }
  }, [handleInvalidToken]);

  const fetchEvents = useCallback(async () => {
    if (!hasFilters || !isAuthReady) {
      setEvents([]);
      return;
    }
    
    setIsLoadingEvents(true);
    try {
      const url = new URL('https://ritmevents.ru/api/v1/events');
      filters.cities.forEach(city => url.searchParams.append('city', city));
      filters.categories.forEach(category => url.searchParams.append('track', category));
      filters.eventTypes.forEach(type => url.searchParams.append('event_type', type));

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      url.searchParams.append('date_from', todayStr);
      url.searchParams.append('date_to', nextWeekStr);

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url.toString(), { headers });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.items || []);
      } else if (response.status === 401) {
        console.error("Токен недействителен при запросе событий");
        handleInvalidToken();
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Ошибка при запросе событий:', error);
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [filters, token, hasFilters, isAuthReady, handleInvalidToken]);

  const handleFilterChange = useCallback(async (newFilters) => {
    setFilters(newFilters);
    if (token && userId && isAuthReady) {
      await saveFiltersToServer(newFilters, token, userId);
    }
  }, [token, userId, setFilters, saveFiltersToServer, isAuthReady]);

  const resetFilters = useCallback(async () => {
    const emptyFilters = {
      cities: [],
      categories: [],
      eventTypes: [],
      participationTypes: []
    };
    
    setFilters(emptyFilters);
    if (token && userId && isAuthReady) {
      await saveFiltersToServer(emptyFilters, token, userId);
    }
  }, [token, userId, setFilters, saveFiltersToServer, isAuthReady]);

  const fetchUserData = useCallback(async (accessToken) => {
    try {
      const userRes = await fetch('https://ritmevents.ru/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (userRes.ok) {
        const userData = await userRes.json();
        setUserId(userData.id);
        localStorage.setItem('user_id', String(userData.id)); 

        const newFilters = {
          cities: userData.city ? userData.city.split(',').map(c => c.trim()) : [],
          categories: userData.track ? userData.track.split(',').map(t => t.trim()) : [],
          eventTypes: userData.preferred_event_types
            ? userData.preferred_event_types.split(',').map(e => e.trim())
            : [],
          participationTypes: userData.preferred_participation_types
            ? userData.preferred_participation_types.split(',').map(p => p.trim())
            : []
        };

        setFilters(newFilters);
        const hasUserFilters = Object.values(newFilters).flat().length > 0;
        setIsDrawerOpen(!hasUserFilters);
        setIsAuthReady(true);
      } else if (userRes.status === 401) {
        console.error("Токен недействителен при загрузке пользователя");
        handleInvalidToken();
      } else {
        setIsDrawerOpen(true);
        setIsAuthReady(false);
        handleInvalidToken();
      }
    } catch (error) {
      console.error("Ошибка загрузки данных пользователя:", error);
      setIsAuthReady(false);
      handleInvalidToken();
    }
  }, [setFilters, handleInvalidToken]);

  useEffect(() => {
    const tryAuth = async () => {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;

      if (initData) {
        try {
          const response = await fetch('https://ritmevents.ru/api/v1/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: initData }),
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            setToken(data.access_token);
            setIsLoggedIn(true);
            await fetchUserData(data.access_token);
            setIsCheckingAuth(false);
            return;
          }

          console.log('tg auth недоступен, статус:', response.status);
        } catch (error) {
          console.log('Ошибка tg auth:', error);
        }
      }

      
      const savedToken = localStorage.getItem('access_token');
      if (savedToken) {
        setToken(savedToken);
        setIsLoggedIn(true);
        await fetchUserData(savedToken);
        setIsCheckingAuth(false);
        return;
      }

      
      setShowInputCode(true);
      setIsCheckingAuth(false);
    };

    tryAuth();
  }, [fetchUserData]);

  const handleLogin = async () => {
    if (!code.trim()) return;
    setLoginError('');

    try {
      const response = await fetch('https://ritmevents.ru/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setToken(data.access_token);
        setIsLoggedIn(true);
        setShowInputCode(false);
        await fetchUserData(data.access_token);
      } else {
        setLoginError('Неверный или истёкший код. Попробуйте ещё раз.');
      }
    } catch (error) {
      console.log('ошибка:', error);
      setLoginError('Ошибка соединения. Попробуйте позже.');
    }
  };

  useEffect(() => {
    if (isAuthReady) {
      fetchEvents();
    }
  }, [fetchEvents, isAuthReady]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="events">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (showInputCode) {
    return (
      <div className="events">
        <div className="login-container">
          <h2>Вход</h2>
          <p>Получите код, написав <b>/login</b> боту <b>@ritmevents_bot</b>, и введите его ниже</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Введите код"
            maxLength={6}
            className="login-input"
          />
          {loginError && <p className="login-error">{loginError}</p>}
          <Button mode="filled" stretched size="m" onClick={handleLogin}>
            Войти
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="events">
      <div className="filters-header-sticky">
        <Button
          mode="outline"
          stretched
          size="m"
          onClick={() => setIsDrawerOpen(true)}
          className="filters-open-btn"
        >
          Фильтры {hasFilters ? (
          <button 
            className="filter__icon"
            onClick={(e) =>{
              e.stopPropagation();
              resetFilters()
            }}
            >
            
              <img src={closeIcon}/>
            </button>
            
          ) : (
            <img src={arrowDown} className="filter__icon"/>
          )}
        </Button>
      </div>
      
      <Filters
        filters={filters}
        onFilterChange={handleFilterChange}
        isOpen={isDrawerOpen}
        setIsOpen={setIsDrawerOpen}
        onReset={resetFilters}
      />


      {hasFilters && (
        <div className="events__found">
          Нашёл для тебя события ({events.length}) на ближайшей неделе, которые подходят под твои интересы. 
        </div>
      )}
      <div className="digest-list">
        {!hasFilters ? (
          <Placeholder
            className="placeholder"
            header="Выберите фильтры"
            description="Нажмите на кнопку «Фильтры» и выберите интересующие вас параметры, чтобы увидеть мероприятия"
          />
        ) : isLoadingEvents ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Загрузка мероприятий...</p>
          </div>
        ) : events.length > 0 ? (
          events.map(event => (
            <div key={event.id} className="digest__item">
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
              
              <Link 
                    to={`/events/${event.id}`} 
                    state={{ token: token, userId: userId }}
                    className="digest__link"
                  >
                    <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
            </Link>
            </div>
          ))
        ) : (
          <Placeholder
            className="placeholder"
            header="Нет предстоящих мероприятий"
            description="Попробуйте изменить параметры фильтрации"
          />
        )}
      </div>
    </div>
  );
}