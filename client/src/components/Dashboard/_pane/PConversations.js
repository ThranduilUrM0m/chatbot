import React from 'react';
import SimpleBar from 'simplebar-react';

import 'simplebar-react/dist/simplebar.min.css';

const PConversations = (props) => {
    return (
        <div className='_pane d-flex flex-column'>
            <div className='_header'>
                {/* Table only conversation and all its information but message Search by ID user or date */}
            </div>
            <div className='_body flex-grow-1'>
                <SimpleBar style={{ maxHeight: '100%' }} forceVisible='y' autoHide={false}>
                    <div>Conversations</div>
                </SimpleBar>
            </div>
        </div>
    );
}

export default PConversations;