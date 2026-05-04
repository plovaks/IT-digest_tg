import { useState } from "react";
import './Feedback.css'
export default function Feedback() {


    const handleFeedback = async () => {

        try {
            const res = await fetch (`https://ritmevents.ru/api/v1/feedback`, {
                method: 'POST',
                
            })

            if (!res.ok){
                const errorText = await res.text();
                throw new Error(`Ошибка Добавления ${res.status} ${errorText}`)

            }

            const data = await res.json();
            return data 

            
        } catch (error) {
            
        }
    }


    return(
        <div>оставить обратную связь </div>
    )
}