import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCalendarUrls } from "../../data/calendarUrl";
import eventsData from "../../data/mock_events.json";
import currency from "../../assets/icons/currency.svg";
import date from "../../assets/icons/DateRange.svg";
import place from "../../assets/icons/Place.svg";
import time from "../../assets/icons/time.svg";
import './Event.css';

export default function Event() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [addToCalendar, setAddToCalendar] = useState(false);

  useEffect(() => {
    try {
      const eve = eventsData.find(item => item.id === Number(id));
      setEvent(eve);
    } catch (error) {
      console.error("Ошибка при поиске события:", error);
    }
  }, [id]);

  // useEffect(() => {
  //   const tg = window.Telegram?.WebApp;
  //   if (tg) {
  //     tg.BackButton.show();
  //     const handleBack = () => window.history.back();
  //     tg.onEvent('backButtonClicked', handleBack);
  //     return () => {
  //       tg.offEvent('backButtonClicked', handleBack);
  //       tg.BackButton.hide();
  //     };
  //   }
  // }, []);

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
    if (e) e.preventDefault();
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  if (!event) {
    return <div className="event__not-found">Событие не найдено</div>;
  }

  const calendarLinks = getCalendarUrls(event);

  const selectCalendar = (url) => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
    setAddToCalendar(false);
  };

  return (
    <div className="event">
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
                <time dateTime={event.start_time}>{event.start_time}</time>
                {event.end_time && (
                  <>
                    <span> - </span>
                    <time dateTime={event.end_time}>{event.end_time}</time>
                  </>
                )}
              </div>
            )}
          </div>

          {Number.isInteger(event.price) && (
            <div className="event__price">
              <img src={currency} alt="price icon" />
              {event.price === 0 ? "Бесплатно" : event.price}
            </div>
          )}

          <div className="event__location">
            <img src={place} alt="place icon" />
            <span className="location__text">
              <span className="event__city">{event.city?.join(', ')}</span>
              {event.address && <span className="event__address">, {event.address}</span>}
            </span>
          </div>

          <div className="event__tags">
            {event.tags.map((tag, index) => (
              <span key={index} className="event__tag">#{tag}</span>
            ))}
          </div>
        </div>

        <div className="event__extraInfo">
          <div className="event__tabs">
            {['description', 'speakers', 'organizers'].map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'description' ? 'Описание' : tab === 'speakers' ? 'Спикеры' : 'Организаторы'}
              </button>
            ))}
          </div>

          <div className="tab__content">
            {activeTab === 'description' && (
              <div className="event__description-tab">
                <p className="description-text">{event.description}</p>
              </div>
            )}
            {activeTab === 'speakers' && (
              <div className="event__speakers-tab">
                {event.speakers.map((speaker, index) => {
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
                  {event.organizers.map((org, index) => (
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

      <div className="event__action" style={{ position: 'relative' }}>
        <a
          href={event.registration_url}
          className="event-register--btn"
          onClick={(e) => handleOpenLink(e, event.registration_url)}
        >
          Зарегистрироваться
        </a>

        {event.start_date && (
          <>
            <button
              onClick={() => setAddToCalendar(!addToCalendar)}
              className="event-addToCalendar--btn"
            >
              Добавить в календарь
            </button>

            {addToCalendar && (
              <div className="calendar-dropdown">
                <button 
                  onClick={() => selectCalendar(calendarLinks.google)}
                >
                  Google Календарь
                </button>
                <button 
                  onClick={() => selectCalendar(calendarLinks.yandex)}
                >
                  Яндекс Календарь
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
