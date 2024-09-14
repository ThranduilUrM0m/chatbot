import React from 'react';
import SimpleBar from 'simplebar-react';

import 'simplebar-react/dist/simplebar.min.css';

const PDashboard = (props) => {
    return (
        <div className='_pane d-flex flex-column'>
            <div className='_header'>

            </div>
            <div className='_body flex-grow-1'>
                <SimpleBar style={{ maxHeight: '100%' }} forceVisible='y' autoHide={false}>
                    <div>_dashboard</div>
                </SimpleBar>
            </div>
        </div>
    );
}

export default PDashboard;