import { Menu, Transition} from '@headlessui/react'

export default function MenuDropDown() {
    return (
        <div className="flex mr-5">
            <div className="relative inline-block text-left">
                <Menu>
                    {({ open }) => (
                        <>
                            <span className="rounded-md shadow-sm">
                                <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium leading-5 text-orange-900 transition duration-150 ease-in-out bg-white rounded-md hover:text-orange-700 focus:outline-none focus:border-orange-300 focus:shadow-outline-orange active:bg-orange-50  active:text-orange-800 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-600 dark:focus-visible:border-gray-400 dark:hover:bg-gray-400 dark:hover:text-gray-900">
                                    <span>Menu</span>
                                    
                                    <svg
                                        className="w-5 h-5 ml-2 -mr-1"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </Menu.Button>
                            </span>
                            
                            <Transition
                                show={open}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items
                                    static
                                    className="absolute right-0 w-56 mt-2 origin-top-right bg-white border border-orange-200 divide-y divide-orange-100 rounded-md shadow-lg outline-none dark:bg-gray-500"
                                >
                                
                                    <div className="py-1">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <a
                                                    href="/"
                                                    className={`${ active ? "bg-orange-100 text-orange-900 dark:bg-gray-900 dark:text-gray-600" : "text-orange-700 dark:text-gray-300" } flex justify-between w-full px-4 py-2 text-sm leading-5 text-left`}
                                                >
                                                    Home
                                                </a>
                                            )}
                                        </Menu.Item>
                                    </div>

                                    <div className="py-1">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <a
                                                    href="/frames"
                                                    className={`${ active ? "bg-orange-100 text-orange-900 dark:bg-gray-900 dark:text-gray-600" : "text-orange-700 dark:text-gray-300" } flex justify-between w-full px-4 py-2 text-sm leading-5 text-left`}
                                                >
                                                    Cadres
                                                </a>
                                            )}
                                        </Menu.Item>
                                        
                                        <Menu.Item>
                                            {({ active }) => (
                                                <a
                                                    href="/librarys"
                                                    className={`${ active ? "bg-orange-100 text-orange-900 dark:bg-gray-900 dark:text-gray-600" : "text-orange-700 dark:text-gray-300" } flex justify-between w-full px-4 py-2 text-sm leading-5 text-left`}
                                                >
                                                    Bibliothéques
                                                </a>
                                            )}
                                        </Menu.Item>
                                    </div>
                                    
                                </Menu.Items>
                            </Transition>
                        </>
                    )}
                </Menu>
            </div>
        </div>
    )
}