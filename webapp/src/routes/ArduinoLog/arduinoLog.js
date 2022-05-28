import {useEffect, useState} from 'react'
import moment from "moment-timezone";
import "moment/locale/fr";
import Spinner from "../../components/spinner";
import TransitionView from "../../components/transition";
import InfiniteScroll from "react-infinite-scroll-component";
import {GetEventsLogArduino} from "../../services/eventsLogArduinoServices";

export default function ArduinoLog() {

    const [hasMore, setHasMore] = useState(true);
    const [pageServer, setPageServer] = useState(1);
    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [logs, setLogs] = useState([]);

    function getData() {
        GetEventsLogArduino(pageServer + 1)
            .then((eventsLogArduino) => {
                    if (eventsLogArduino.length === 0) {
                        setHasMore(false);
                        return;
                    }
                    setIsLoaded(true);

                    setLogs(logs.concat(eventsLogArduino));
                    setPageServer(pageServer + 1);
                },
                (error) => {
                    setIsLoaded(true);
                    setError(error);
                }
            );
    }

    useEffect(() => {
        GetEventsLogArduino()
            .then((eventsLogArduino) => {
                    setIsLoaded(true);
                    setLogs(eventsLogArduino);
                },
                (error) => {
                    setIsLoaded(true);
                    setError(error);
                }
            );
    }, []);

    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }
    
    if (error) {
        return <div>Erreur : {error.message}</div>;
    } else if (!isLoaded) {
        return <Spinner className="mt-40"/>;
    } else {
        return (
            <TransitionView>
                <div className="flex w-full flex-col items-center justify-center">
                    <div className="w-full lg:max-w-10xl md:max-w-4xl px-2 py-8" >
                        <InfiniteScroll
                            dataLength={logs.length} //This is important field to render the next data
                            next={getData}
                            hasMore={hasMore}
                            loader={<h4>Chargement...</h4>}
                        >
                            <div className={classNames(
                                'rounded-xl bg-white',
                                'p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-orange-400 focus:outline-none focus:ring-2 mb-1',
                                'bg-gray-900 border-gray-600'
                            )}>
                                <ul className="flex w-full flex-col justify-center">
                                    {logs.map((log, idxLog) => (
                                        <p
                                            key={idxLog}
                                            className="flex gap-5 flex-row bg-gray-900 text-gray-500 border-gray-600 focus-visible:border-gray-400 hover:bg-yellow-600 hover:text-gray-900 "
                                            style={{fontSize: ".55rem"}}
                                        >
                                            <a href={"/frames/"+log.frame._id.$oid} className="underline">{log.frame.name}</a>
                                            {moment.utc(log.created_at).tz("Europe/Paris").fromNow()}
                                            <p>{log.type_event}</p>
                                            {log.message}
                                        </p>
                                    ))}
                                </ul>
                            </div>
                        </InfiniteScroll>
                    </div>
                </div>
            </TransitionView>
        )
    }
}