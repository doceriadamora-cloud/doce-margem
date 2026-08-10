"use client";

import PackagingForm from "./PackagingForm";
import PackagingList from "./PackagingList";

/** Combina cadastro e listagem sem adicionar um wrapper que altere o grid da página. */
export default function PackagingsScreen() {
  return (
    <>
      <PackagingForm />
      <PackagingList />
    </>
  );
}
