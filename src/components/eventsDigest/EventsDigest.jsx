import React, { useEffect, useState } from "react";
import eventsData from "../../data/mock_events.json";
import './EventsDigest.css';
import time from "../../assets/icons/time.svg"
import currency from "../../assets/icons/currency.svg"
import date from "../../assets/icons/DateRange.svg"
import place from "../../assets/icons/Place.svg"
import { Link } from "react-router-dom";

export default function EventsDigest() {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            setTheme(tg.colorScheme);
            

            tg.onEvent('themeChanged', () => {
                setTheme(tg.colorScheme);
                
                updateIconFilter(tg.colorScheme);
            });
        }
    }, []);

    const updateIconFilter = (colorScheme) => {
        const icons = document.querySelectorAll('.event__city img, .event__price img, .event__date img');
        icons.forEach(icon => {
            if (colorScheme === 'dark') {
                icon.style.filter = 'brightness(0) invert(1)';
            } else {
                icon.style.filter = 'none';
            }
        });
    };

    return (
        <div className="events">
           {eventsData.map(event => (
    <div key={event.id} className="digest__item">
        <div className="digest__header">
            <p className="digest__type">{event.event_type?.join(', ')}</p>
            <h3 className="digest__title">{event.title}</h3>
        </div>

        <div className="digest__mainInfo">
            <div className="digest__date-row">
                <div className="digest__day">
                    <img src={date} alt="date icon" />
                    <time dateTime={event.start_date}>
                        {event.start_date.split('-').reverse().join('.')}
                    </time>
                    {event.end_date !== event.start_date && (
                        <><span>—</span><time>{event.end_date.split('-').reverse().join('.')}</time></>
                    )}
                </div>
                <div className="digest__time">
                    <img src={time} alt="time icon" />
                    <time>{event.start_time}</time>
                    {event.end_time && (
                        <><span>-</span><time>{event.end_time}</time></>
                    )}
                </div>
            </div>

            <div className="digest__price">
                <img src={currency} alt="price icon" />
                {event.price === 0 ? "Бесплатно" : event.price}
            </div>

            <div className="digest__location">
                <img src={place} alt="place icon" />
                <span className="digest__location-text">
                    <span className="digest__city">{event.city?.join(', ')}</span>
                    {event.address && <span className="digest__address">, {event.address}</span>}
                </span>
            </div>
            
            <div className="digest__tags">
                {event.tags?.map((tag, index) => (
                    <span key={index} className="digest__tag">#{tag}</span>
                ))}
            </div>
        </div>

        <Link to={`/events/${event.id}`} className="digest__link">
            <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
        </Link>
    </div>
))}

        </div>
    );
}

