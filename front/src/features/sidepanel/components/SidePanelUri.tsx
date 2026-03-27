'use client';

import { useEffect, useState } from 'react';
import { type MeetSidePanelClient } from '@googleworkspace/meet-addons/meet.addons';
import { getMeetSession } from '../../../lib/meet';

export default function Page() {
    const [sidePanelClient, setSidePanelClient] = useState<MeetSidePanelClient>();

    // Launches the main stage when the main button is clicked.
    async function startActivity(e: unknown) {
        if (!sidePanelClient) {
            throw new Error('Side Panel is not yet initialized!');
        }
        await sidePanelClient.startActivity({
            mainStageUrl: import.meta.env.VITE_MAIN_STAGE_URL
        });
    }

    /**
     * Prepares the add-on Side Panel Client.
     */
    useEffect(() => {
        (async () => {
            const session = await getMeetSession();
            setSidePanelClient(await session.createSidePanelClient());
        })();
    }, []);

    return (
        <>
            <div>
                This is the add-on Side Panel. Only you can see this.
            </div>
            <button onClick={startActivity}>
                Launch Activity in Main Stage.
            </button>
        </>
    );
}