import {useEffect, useState} from 'react'
import { Tab } from '@headlessui/react'
import Post from "../components/post";
import moment from "moment-timezone";
import "moment/locale/fr";
import {GetAllEventsLog} from "../services/eventsLogServices";
import Spinner from "../components/spinner";
import TransitionView from "../components/transition";

export default function Home() {

    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        GetAllEventsLog()
            .then((eventsLog) => {
                setIsLoaded(true);
                setCategories(eventsLog);
            },
            (error) => {
                setIsLoaded(true);
                setError(error);
            }
        )
    }, [])

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
                        <Tab.Group>
                            <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                                {Object.keys(categories).map((category) => (
                                    <Tab
                                        key={category}
                                        className={({ selected }) =>
                                            classNames(
                                                'w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-orange-500',
                                                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                                selected
                                                    ? 'bg-white shadow'
                                                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                                            )
                                        }
                                    >
                                        {category}
                                    </Tab>
                                ))}
                            </Tab.List>
                            <Tab.Panels className="mt-2">
                                {Object.values(categories).map((posts, idx) => (
                                    <Tab.Panel
                                        key={idx}
                                        className={classNames(
                                            'rounded-xl bg-white p-3',
                                            'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                                        )}
                                    >
                                        <ul>
                                            {posts.map((post, idxPost) => (
                                                <>
                                                    { post.type_event === "user" ? (
                                                        <>
                                                            {post.frame && !post.is_delete && !post.library ? (
                                                                <Post
                                                                    isClick={false}
                                                                    key={idxPost}
                                                                    title={ post.user.username + " a ajouté le cadre "+ post.frame.name}
                                                                    list={[
                                                                        moment.utc(post.created_at).tz("Europe/Paris").fromNow(),
                                                                        post.frame.ip,
                                                                        post.frame.inch + '" - ' + post.frame.resolution_width + "x"+ post.frame.resolution_height
                                                                    ]} />
                                                            ) : post.frame && post.is_delete && !post.library ? (
                                                                <Post
                                                                    isClick={false}
                                                                    key={idxPost}
                                                                    title={ post.user.username + " a archivé le cadre "+ post.frame.name}
                                                                    list={[
                                                                        moment.utc(post.created_at).tz("Europe/Paris").fromNow(),
                                                                        post.frame.ip,
                                                                        post.frame.inch + '" - ' + post.frame.resolution_width + "x"+ post.frame.resolution_height
                                                                    ]} />
                                                            ) : post.library && !post.is_delete && !post.frame ? (
                                                                <Post
                                                                    isClick={false}
                                                                    key={idxPost}
                                                                    title={ post.user.username + " a ajouté la bibliothéque "+ post.library.name}
                                                                    list={[
                                                                        moment.utc(post.created_at).tz("Europe/Paris").fromNow(),
                                                                        "Délai: " + post.library.delay + 's'
                                                                    ]} />
                                                            ) : post.library && post.is_delete && !post.frame ? (
                                                                <Post
                                                                    isClick={false}
                                                                    key={idxPost}
                                                                    title={ post.user.username + " a archivé la bibliothéque "+ post.library.name}
                                                                    list={[
                                                                        moment.utc(post.created_at).tz("Europe/Paris").fromNow(),
                                                                        "Délai: " + post.library.delay + 's'
                                                                    ]} />
                                                            ) : post.picture && !post.is_delete ? (
                                                                <Post
                                                                    isClick={false}
                                                                    key={idxPost}
                                                                    title={ post.user.username + " a ajouté une image "+ post.picture.name}
                                                                    list={[
                                                                        moment.utc(post.created_at).tz("Europe/Paris").fromNow(),
                                                                        post.picture.library.name
                                                                    ]} />
                                                            ) : post.picture && post.is_delete ? (
                                                                <Post
                                                                    isClick={false}
                                                                    key={idxPost}
                                                                    title={ post.user.username + " a archivé une image "+ post.picture.name}
                                                                    list={[
                                                                        moment.utc(post.created_at).tz("Europe/Paris").fromNow(),
                                                                        post.picture.library.name
                                                                    ]} />
                                                            ) : post.library && post.frame && !post.is_delete ? (
                                                                <Post
                                                                    isClick={false}
                                                                    key={idxPost}
                                                                    title={ post.user.username + " a activé la bibliothéque " + post.library.name + " sur le cadre "+ post.frame.name}
                                                                    list={[
                                                                        moment.utc(post.created_at).tz("Europe/Paris").fromNow(),
                                                                        post.frame.ip
                                                                    ]} />
                                                            ) : post.library && post.frame && post.is_delete ? (
                                                                <Post
                                                                    isClick={false}
                                                                    key={idxPost}
                                                                    title={ post.user.username +" a désactivé la bibliothéque " + post.library.name + " sur le cadre "+ post.frame.name}
                                                                    list={[
                                                                        moment.utc(post.created_at).tz("Europe/Paris").fromNow(),
                                                                        post.frame.ip
                                                                    ]} />
                                                            ) : null }
                                                        </>
                                                    ) : post.type_event === "server" ? (
                                                        <>
                                                            {post.library && post.frame && post.picture && !post.is_delete ? (
                                                                <Post
                                                                    isClick={false}
                                                                    key={idxPost}
                                                                    title={ "L'image " + post.picture.name + " a été envoyé sur le cadre "+ post.frame.name}
                                                                    list={[
                                                                        moment.utc(post.created_at).tz("Europe/Paris").fromNow(),
                                                                        post.frame.ip
                                                                    ]} />
                                                            ) : null }
                                                        </>
                                                    ) : null}
                                                </>
                                            ))}
                                        </ul>
                                    </Tab.Panel>
                                ))}
                            </Tab.Panels>
                        </Tab.Group>
                    </div>
                </div>
            </TransitionView>
        )
    }
}