import React, { useEffect } from 'react';
import Inquiry from '../Parts/Inquiry';
import _ from 'lodash';
import $ from 'jquery';

const Home = (props) => {

    useEffect(() => {
        $('._home ._s4').on('mousemove', (event) => {
            let width = $('._home ._s4').width() / 2;
            let amountMovedX = ((width - event.pageX) * 1 / 64);

            $('._home ._s4 .before').css('marginLeft', amountMovedX);
        });
    }, []);

    return (
        <main className='_home'>
            <section className='_s1 grid'>
                
            </section>
            <Inquiry className={'_s4 grid'} />
        </main>
    );
}

export default Home;