import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import './EventsDigest.css';
import { Link, useLocation } from "react-router-dom";
import Filters from "../Filters/Filters";
import { CITIES, CATEGORIES, EVENT_TYPES, PARTICIPATION_TYPES } from "../../data/filters.js"
import { useAuth } from "../useAuth.jsx";
import { openLink } from "../../data/platformService.js"

import dateIcon from "../../assets/icons/DateRange.svg";
import timeIcon from "../../assets/icons/time.svg";
import priceIcon from "../../assets/icons/currency.svg";
import placeIcon from "../../assets/icons/Place.svg";
import partType from "../../assets/icons/partType.svg";
import webIcon from "../../assets/icons/web.svg"


const ITEMS_PER_PAGE = 20;

const formatTime = (t) => t ? t.substring(0, 5) : '';
const formatDate = (d) => d ? d.split('-').reverse().join('.') : '';

const isEventPassed = (eventDate, eventTime) => {
  if (!eventDate) return true; 
  
  const eventDateTime = new Date(eventDate);
  const now = new Date();
  
  if (eventTime && eventTime.trim() !== '') {
    let hours = 0, minutes = 0;
    if (eventTime.includes(':')) {
      const timeParts = eventTime.split(':');
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    }
    eventDateTime.setHours(hours, minutes, 0, 0);
    return eventDateTime < now;
  }
  
  const eventDateOnly = new Date(eventDate);
  eventDateOnly.setHours(0, 0, 0, 0);
  
  const todayDateOnly = new Date();
  todayDateOnly.setHours(0, 0, 0, 0);
  
  return eventDateOnly < todayDateOnly;
};

const getWeekRange = (offset = 0) => {
  const today = new Date();
  
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + (offset * 7));
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  const formatDateStr = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  };
  
  const formatISO = (date) => date.toISOString().split('T')[0];
  
  return {
    start: formatDateStr(startDate),
    end: formatDateStr(endDate),
    startISO: formatISO(startDate),
    endISO: formatISO(endDate)
  };
};

export default function EventsDigest({ filters, setFilters }) {
  // 
  const {
    platform,
    token,
    userId,
    userData,
    isAuthReady,
    isCheckingAuth,
    showInputCode,
    setShowInputCode,
    authError
  } = useAuth();
  
  useEffect(() => {
  console.log('=== CURRENT PLATFORM ===', platform);
  console.log('window.WebApp:', window.WebApp);
  console.log('window.WebApp?.initData:', window.WebApp?.initData);
}, [platform]);

  const location = useLocation();
  
  // Состояния для дайджеста
  const [currentWeekOffset, setCurrentWeekOffset] = useState(() => {
    if (location.state?.weekOffset !== undefined) return location.state.weekOffset;
    const saved = sessionStorage.getItem('events_week_offset');
    return saved ? parseInt(saved) : 0;
  });
  
  const [currentPage, setCurrentPage] = useState(() => {
    if (location.state?.page !== undefined) return location.state.page;
    const saved = sessionStorage.getItem('events_page');
    return saved ? parseInt(saved) : 0;
  });
  
  const [searchQuery, setSearchQuery] = useState(() => {
    if (location.state?.searchQuery !== undefined) return location.state.searchQuery;
    return sessionStorage.getItem('events_search_query') || '';
  });
  
  const [weekRange, setWeekRange] = useState({ start: '', end: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const searchDebounceRef = useRef(null);

  const activeCount = Object.values(filters).flat().length;
  const hasFilters = activeCount > 0;
  const isSearchMode = searchQuery.trim().length > 0;

  
  useEffect(() => {
    if (platform === 'telegram' && window.Telegram?.WebApp?.expand) {
      window.Telegram.WebApp.expand();
    }
  }, [platform]);
  useEffect(() => {
    if (userData) {
      const newFilters = {
        cities: userData.city ? userData.city.split(',').map(c => c.trim()).filter(Boolean) : [],
        categories: userData.track ? userData.track.split(',').map(t => t.trim()).filter(Boolean) : [],
        eventTypes: userData.preferred_event_types ? userData.preferred_event_types.split(',').map(e => e.trim()).filter(Boolean) : [],
        participationTypes: userData.preferred_participation_types ? userData.preferred_participation_types.split(',').map(p => p.trim()).filter(Boolean) : []
      };
      setFilters(newFilters);
    }
  }, [userData, setFilters]);

  // Сохраняем состояние в sessionStorage
  useEffect(() => {
    sessionStorage.setItem('events_week_offset', currentWeekOffset);
    sessionStorage.setItem('events_page', currentPage);
    sessionStorage.setItem('events_search_query', searchQuery);
  }, [currentWeekOffset, currentPage, searchQuery]);

  const handleInvalidToken = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    setShowInputCode(true);
  }, [setShowInputCode]);

  // Сохранение фильтров на сервер 
  const saveFiltersToServer = useCallback(async (newFilters, authToken, uid) => {
    if (!authToken || !uid) return;
    try {
      const payload = {
        city: newFilters.cities.join(','),
        track: newFilters.categories.join(','),
        preferred_event_types: newFilters.eventTypes.join(','),
        preferred_participation_types: newFilters.participationTypes.join(',')
      };
      const res = await fetch(`https://ritmevents.ru/api/v1/users/${uid}/filters`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) handleInvalidToken();
    } catch (e) {
      console.error('Ошибка сохранения фильтров:', e);
    }
  }, [handleInvalidToken]);

  // Основной fetch событий 
  const fetchEvents = useCallback(async (page = currentPage) => {
    if (!hasFilters || !isAuthReady) {
      setEvents([]);
      setTotalEvents(0);
      setTotalPages(0);
      return;
    }

    setIsLoadingEvents(true);
    try {
      const { startISO, endISO } = getWeekRange(currentWeekOffset);
      const url = new URL('https://ritmevents.ru/api/v1/events');

      filters.cities.forEach(c => url.searchParams.append('city', c));
      filters.categories.forEach(c => url.searchParams.append('track', c));
      filters.eventTypes.forEach(t => url.searchParams.append('event_type', t));
      filters.participationTypes.forEach(t => url.searchParams.append('participation_type', t));
      url.searchParams.append('date_from', startISO);  
      url.searchParams.append('date_to', endISO);      
      url.searchParams.append('limit', ITEMS_PER_PAGE);
      url.searchParams.append('offset', page * ITEMS_PER_PAGE);

      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(url.toString(), { headers });

      if (res.ok) {
        const data = await res.json();
        const sortedAndFilteredEvents = (data.items || [])
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
          .filter((event) => !isEventPassed(event.start_date, event.start_time));
        
        setEvents(sortedAndFilteredEvents);
        setTotalEvents(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
      }
      else if (res.status === 401) {
        handleInvalidToken();
      } else {
        setEvents([]);
      }
    } catch (e) {
      console.error('Ошибка загрузки событий:', e);
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [filters, token, hasFilters, isAuthReady, handleInvalidToken, currentPage, currentWeekOffset]);

  const fetchAndSetEventsByIds = useCallback(async (ids, page) => {
    if (!ids || ids.length === 0) {
      setEvents([]);
      setTotalEvents(0);
      setTotalPages(0);
      return;
    }
    const start = page * ITEMS_PER_PAGE;
    const pageIds = ids.slice(start, start + ITEMS_PER_PAGE);

    setIsLoadingEvents(true);
    try {
      const results = await Promise.all(
        pageIds.map(async (id) => {
          const res = await fetch(`https://ritmevents.ru/api/v1/events/${id}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          return res.ok ? res.json() : null;
        })
      );
      const validEvents = results.filter(event => 
        event && !isEventPassed(event.start_date, event.start_time)
      );
      setEvents(validEvents);
    } catch (e) {
      console.error('Ошибка загрузки событий по ID:', e);
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [token]);

  // Переключение недель
  const nextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
    setCurrentPage(0);
  };

  const prevWeek = () => {
    if (currentWeekOffset > 0) {
      setCurrentWeekOffset(prev => prev - 1);
      setCurrentPage(0);
    }
  };

  useEffect(() => {
    const range = getWeekRange(currentWeekOffset);
    setWeekRange({ start: range.start, end: range.end });
  }, [currentWeekOffset]);

  const runSearch = useCallback(async (query, page = 0) => {
    console.log('runSearch запущен, query:', query);
    setEvents([]);
    setIsLoadingEvents(true);
    try {
      const { startISO, endISO } = getWeekRange(currentWeekOffset);
      
      const body = {
        query: query,
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
        date_from: startISO,
        date_to: endISO
      };

      const res = await fetch('https://ritmevents.ru/api/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        const ids = data.event_ids || [];
        
        setTotalEvents(ids.length);
        setTotalPages(Math.ceil(ids.length / ITEMS_PER_PAGE));
        
        if (ids.length > 0) {
          await fetchAndSetEventsByIds(ids, page);
        } else {
          setEvents([]);
        }
      } else {
        setEvents([]);
        setTotalEvents(0);
        setTotalPages(0);
      }
    } catch (e) {
      console.error('Ошибка в runSearch:', e);
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [token, fetchAndSetEventsByIds, currentWeekOffset]);

  useEffect(() => {
    if (!isAuthReady) return;

    if (searchQuery.trim()) {
      runSearch(searchQuery.trim(), currentPage);
      return;
    }

    if (hasFilters) {
      fetchEvents(currentPage);
    } else {
      setEvents([]);
      setTotalEvents(0);
      setTotalPages(0);
    }
  }, [
    isAuthReady,
    filters,
    currentPage,
    searchQuery,
    hasFilters,
    runSearch,
    fetchEvents,
    currentWeekOffset
  ]);
  
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setCurrentPage(0);
  };

  const handleFilterChange = useCallback(async (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(0);
    if (token && userId && isAuthReady) {
      await saveFiltersToServer(newFilters, token, userId);
    }
    if (searchQuery.trim()) {
      runSearch(searchQuery.trim(), 0);
    }
  }, [token, userId, setFilters, saveFiltersToServer, isAuthReady, searchQuery, runSearch]);

  const resetFilters = useCallback(async () => {
    const empty = { cities: [], categories: [], eventTypes: [], participationTypes: [] };
    setFilters(empty);
    setCurrentPage(0);
    sessionStorage.removeItem('events_week_offset');
    sessionStorage.removeItem('events_page');
    sessionStorage.removeItem('events_search_query');
    setCurrentWeekOffset(0);
    setSearchQuery('');
    
    if (token && userId && isAuthReady) {
      await saveFiltersToServer(empty, token, userId);
    }
    
    if (searchQuery.trim()) {
      runSearch(searchQuery.trim(), 0);
    }
  }, [token, userId, setFilters, saveFiltersToServer, isAuthReady, searchQuery, runSearch]);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = async () => {
    if (!code.trim()) return;
    setLoginError('');
    try {
      const res = await fetch('https://ritmevents.ru/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setToken(data.access_token);
        setShowInputCode(false);
        window.location.reload();
      } else {
        setLoginError('Неверный или истёкший код. Попробуйте ещё раз.');
      }
    } catch (e) {
      setLoginError('Ошибка соединения. Попробуйте позже.');
    }
  };

  const handleOpenLink = (e, url) => {
    e.preventDefault();
    openLink(url, platform);
  };

  // Отображение загрузки
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

  // Отображение ввода кода
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
        <div className="search-and-filters">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск мероприятий..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <Button
            mode={hasFilters ? "filled" : "outline"}
            size="m"
            onClick={() => setIsDrawerOpen(true)}
            className="filters-open-btn"
          >
            Фильтры
          </Button>
        </div>
      </div>

      <Filters
        filters={filters}
        onFilterChange={handleFilterChange}
        isOpen={isDrawerOpen}
        setIsOpen={setIsDrawerOpen}
        onReset={resetFilters}
      />

      {(hasFilters || isSearchMode) && !isLoadingEvents && (
        <>
          <div className="events__found">
            {isSearchMode
              ? `Результаты поиска «${searchQuery}»:`
              : `Нашёл (${totalEvents}) мероприятий на ближайшей неделе`}
          </div>
          <div className="week-navigation">
            <button 
              className="week-nav-btn prev"
              onClick={prevWeek}
              disabled={currentWeekOffset === 0}
            >
              Предыдущая неделя
            </button>
            <span className="week-range">
              {weekRange.start} - {weekRange.end}
            </span>
            <button 
              className="week-nav-btn next"
              onClick={nextWeek}
            >
              Следующая неделя
            </button>
          </div>
        </>
      )}

      <div className="digest-list">
        {!hasFilters && !isSearchMode ? (
          <Placeholder
            className="placeholder"
            header="Выберите фильтры или введите поиск"
            description="Нажмите «Фильтры» или введите запрос, чтобы найти мероприятия"
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
                    {event.price === 0 ? 'Бесплатно' : `${event.price}`}
                  </div>
                )}
                {event.participation_type && (
                  <div className="digest__partType">
                    <img src={partType} alt="person speaking icon"/> 
                    {event.participation_type?.join(', ')}
                  </div>
                )}
                <div className="digest__location">
                  <img src={placeIcon} alt="icon" />
                  {event.city?.join(', ') || event.address || 'Онлайн'}
                </div>

                {event.event_url && (
                  <div className="digest__eventUrl">
                    <img src={webIcon} alt="site icon" className="icon"/>
                    <a 
                      href={event.event_url}
                      onClick={(e) => handleOpenLink(e, event.event_url)}
                      className="digest-link"
                    >
                      Сайт мероприятия
                    </a>
                  </div>
                )}
              </div>
              {event.tags?.length > 0 && (
                <div className="digest__tags">
                  {event.tags.map((tag, i) => (
                    <span key={i} className="digest__tag">#{tag}</span>
                  ))}
                </div>
              )}
              <Link
                to={`/events/${event.id}`}
                state={{ 
                  token, 
                  userId,
                  weekOffset: currentWeekOffset,
                  page: currentPage,
                  searchQuery: searchQuery
                }}
                className="digest__link"
              >
                <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
              </Link>
            </div>
          ))
        ) : (
          <Placeholder
            className="placeholder"
            header="Нет мероприятий"
            description="Попробуйте изменить поисковый запрос или фильтры"
          />
        )}
      </div>

      {!isLoadingEvents && events.length > 0 && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            Назад
          </button>
          <span className="pagination-info">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
}