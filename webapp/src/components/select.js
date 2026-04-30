import { Fragment } from "react";
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, SelectorIcon } from '@heroicons/react/solid'

export default function Select(props) {
    return (
        <div className={"w-full " + props.className}>
            <Listbox value={props.selected} onChange={props.setSelected}>
                <div className="relative mt-1">
                    <Listbox.Button className="relative w-full cursor-default bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-4 pr-10 text-left text-sm text-zinc-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 transition-colors">
                        <span className="block truncate">{props.selected.title}</span>
                        {!props.disabled ? (
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <SelectorIcon className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                            </span>
                        ) : null}
                    </Listbox.Button>
                    {!props.disabled ? (
                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Listbox.Options
                                className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-zinc-800 border border-zinc-700 py-1 text-sm shadow-xl focus:outline-none"
                                style={{zIndex: "10000"}}
                            >
                                {props.list.map((item, itemIdx) => (
                                    <Listbox.Option
                                        key={itemIdx}
                                        className={({ active }) =>
                                            `relative cursor-default select-none py-2.5 pl-10 pr-4 transition-colors ${
                                                active ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-300'
                                            }`
                                        }
                                        value={item}
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span className={`block truncate ${selected ? 'font-medium text-orange-400' : 'font-normal'}`}>
                                                    {item.title}
                                                </span>
                                                {selected ? (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-orange-500">
                                                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </Transition>
                    ) : null}
                </div>
            </Listbox>
        </div>
    );
}