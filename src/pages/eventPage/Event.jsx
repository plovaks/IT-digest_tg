import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import eventsData from "../../data/mock_events.json";
import currency from "../../assets/icons/currency.svg"
import date from "../../assets/icons/DateRange.svg"
import place from "../../assets/icons/Place.svg"
import time from "../../assets/icons/time.svg"


import './Event.css';

export default function Event() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    // состояние для активной вкладки
    const [activeTab, setActiveTab] = useState('description');

    useEffect(() => {
        try {
            const eve = eventsData.find(item => item.id === Number(id));
            setEvent(eve);
        } catch (error) {
            console.error("Ошибка при поиске события:", error);
        }
    }, [id]);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.BackButton.show();
            const handleBack = () => window.history.back();
            tg.onEvent('backButtonClicked', handleBack);

            
            return () => {
                tg.offEvent('backButtonClicked', handleBack);
                tg.BackButton.hide();
            };
        }
    }, []);

    const handleOpenLink = (e, url) => {
        e.preventDefault(); 
        const tg = window.Telegram?.WebApp;
        if (tg && tg.openLink) {
            tg.openLink(url); 
        } else {
            window.open(url, '_blank'); 
        }
    };

    if (!event) {
        return (
            <div className="event__not-found">Событие не найдено</div>
        );
    }

    return (
        <div className="event">
            <div className="event__header">
                <p className="event__type">{event.event_type?.join(', ')}</p>
                <h1 className="event__title">{event.title}</h1>
            </div>

            <div className="event__info">
                
                <div className="event__mainInfo">
                    <div className="event__date">
                        <p className="event__day">
                            <div className="event__dates">
                                        <img src={date} alt="date icon" />
                                        <time dateTime={event.start_date}>
                                            {event.start_date.split('-').reverse().join('.')}
                                        </time>
                                        {event.end_date !== event.start_date &&(
                                            <time dateTime={event.end_date}>
                                                {event.end_date.split('-').reverse().join('.')}
                                            </time>
                                        )}
                                    </div>
                        </p>
                        <p className="event__time">
                            <img src={time} alt="date icon" />
                            <time dateTime={event.start_time}>
                                
                                {event.start_time}
                            </time>
                            {event.end_time && (
                                <>
                                    <span>-</span>
                                    <time dateTime={event.end_time}>{event.end_time}</time>
                                </>
                            )}
                        </p>
                    </div>
                    <div className="event__price">
                        <img src={currency} alt="price icon" />
                        {event.price === 0 ? "Бесплатно" : event.price}
                    </div>
                    <div className="event__location">
                        <img src={place} alt="price icon" />
                        <span className="location__text">
                            <span className="event__city">
                            
                            {event.city?.join(', ')}
                        </span>
                        {event.address && (
                            <span className="event__address">
                                , {event.address}
                            </span>
                        )}
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
                        <button
                            className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
                            onClick={() => setActiveTab('description')}
                        >
                            Описание
                        </button>
                            
                        <button
                            className={`tab-btn ${activeTab === 'speakers' ? 'active' : ''}`}
                            onClick={() => setActiveTab('speakers')}
                        >
                            Спикеры
                        </button>

                        <button
                            className={`tab-btn ${activeTab === 'organizers' ? 'active' : ''}`}
                            onClick={() => setActiveTab('organizers')}
                        >
                            Организаторы
                        </button>
                        
                    </div>

                    <div className="tab__content">
                        {activeTab === 'description' && (
                            <div className="event__description-tab">
                                    
                                    
                                    <p className="description-text">{event.description}</p>
                            </div>
                        )}
                        {
                            activeTab === 'speakers' && (
                                <div className="event__speakers-tab">
                                    {event.speakers.map((speaker,index) => 
                                         
                                        <div key={index}>
                                            <span className="speaker__name">{speaker.split('-')[0]}</span>
                                            <span>-</span>
                                            <span className="speaker__desc">{speaker.split('-').slice(1)}</span>
                                        </div>
                                    )}
                                </div>
                            )
                        }
                        {
                            activeTab === 'organizers' && (
                                <div className="event__organizers">
                                    <div className="organizers-list">
                                        {event.organizers.map((org, index) => {
                                            return org.url ? (
                                                <a 
                                                    key={index}
                                                    href={org.url}
                                                    className="organizer-chip"
                                                    onClick={(e) => handleOpenLink(e, org.url)}
                                                >
                                                    {org.name}
                                                </a>
                                            ) : (
                                                <span key={index} className="organizer-chip organizer-chip--no-link">
                                                    {org.name}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )
                        }
                    </div>
                    

                    
                    
                    
                </div>
            </div>
            
            <div className="event__action">
                <a 
                    href={event.registration_url} 
                    className="event__button"
                    onClick={(e) => handleOpenLink(e, event.registration_url)}
                >
                    Зарегистрироваться
                </a>
            </div>
        </div>
    );
}