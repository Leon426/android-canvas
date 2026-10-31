"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  componentStyleOf,
  DEFAULT_CUSTOM_PACKAGE_ID,
  OFFICIAL_PACKAGE_ID,
  resolveComponentInstance,
  type ComponentLibrary,
} from "@/lib/componentLibrary";
import { t, type Lang } from "@/lib/i18n";
import { Group, Item, uid } from "@/lib/tokens";

type SetGroups = (next: Group[] | ((prev: Group[]) => Group[])) => void;

type UseComponentLibraryActionsArgs = {
  lang: Lang;
  componentLibrary: ComponentLibrary;
  setComponentLibrary: Dispatch<SetStateAction<ComponentLibrary>>;
  setGroups: SetGroups;
  selected: Item | null;
  selectedResolved: Item | null;
  snapshot: (withMeta?: boolean) => void;
  patchSelected: (patch: Partial<Item>) => void;
};

/**
 * Package / definition CRUD and save-as / update / detach for the selected part.
 */
export function useComponentLibraryActions({
  lang,
  componentLibrary,
  setComponentLibrary,
  setGroups,
  selected,
  selectedResolved,
  snapshot,
  patchSelected,
}: UseComponentLibraryActionsArgs) {
  const onActivePackage = useCallback(
    (activePackageId: string) => setComponentLibrary((library) => ({ ...library, activePackageId })),
    [setComponentLibrary],
  );

  const onCreatePackage = useCallback(
    (name: string) => {
      snapshot(true);
      setComponentLibrary((library) => {
        const id = uid();
        return { ...library, activePackageId: id, packages: [...library.packages, { id, name, definitions: [] }] };
      });
    },
    [setComponentLibrary, snapshot],
  );

  const onRenamePackage = useCallback(
    (id: string, name: string) => {
      snapshot(true);
      setComponentLibrary((library) => ({
        ...library,
        packages: library.packages.map((pack) => (pack.id === id ? { ...pack, name } : pack)),
      }));
    },
    [setComponentLibrary, snapshot],
  );

  const onDeletePackage = useCallback(
    (id: string) => {
      const removed = componentLibrary.packages.find((pack) => pack.id === id);
      if (!removed) return;
      snapshot(true);
      const definitionIds = new Set(removed.definitions.map((definition) => definition.id));
      setGroups((current) =>
        current.map((group) => ({
          ...group,
          items: group.items.map((item) => {
            const ref = item.component;
            if (!ref || (ref.packageId ? ref.packageId !== id : !definitionIds.has(ref.definitionId))) return item;
            const resolved = resolveComponentInstance(item, componentLibrary).item;
            const { component: _component, ...detached } = resolved;
            return detached;
          }),
        })),
      );
      setComponentLibrary((library) => ({
        ...library,
        activePackageId: library.activePackageId === id ? OFFICIAL_PACKAGE_ID : library.activePackageId,
        packages: library.packages.filter((pack) => pack.id !== id),
      }));
    },
    [componentLibrary, setComponentLibrary, setGroups, snapshot],
  );

  const onRenameDefinition = useCallback(
    (packageId: string, definitionId: string, name: string) => {
      snapshot(true);
      setComponentLibrary((library) => ({
        ...library,
        packages: library.packages.map((pack) =>
          pack.id !== packageId
            ? pack
            : {
                ...pack,
                definitions: pack.definitions.map((definition) =>
                  definition.id === definitionId ? { ...definition, name } : definition,
                ),
              },
        ),
      }));
    },
    [setComponentLibrary, snapshot],
  );

  const onDeleteDefinition = useCallback(
    (packageId: string, definitionId: string) => {
      snapshot(true);
      setGroups((current) =>
        current.map((group) => ({
          ...group,
          items: group.items.map((item) => {
            const ref = item.component;
            if (!ref || ref.definitionId !== definitionId) return item;
            if (ref.packageId && ref.packageId !== packageId) return item;
            const resolved = resolveComponentInstance(item, componentLibrary).item;
            const { component: _component, ...detached } = resolved;
            return detached;
          }),
        })),
      );
      setComponentLibrary((library) => ({
        ...library,
        packages: library.packages.map((pack) =>
          pack.id !== packageId
            ? pack
            : {
                ...pack,
                definitions: pack.definitions
                  .filter((definition) => definition.id !== definitionId)
                  .map((definition) =>
                    definition.extends === definitionId ? { ...definition, extends: undefined } : definition,
                  ),
              },
        ),
      }));
    },
    [componentLibrary, setComponentLibrary, setGroups, snapshot],
  );

  const onSaveAsComponent = useCallback(
    (name: string) => {
      if (!selected) return;
      snapshot(true);
      const id = uid();
      const active = componentLibrary.activePackageId;
      const packageId =
        active === OFFICIAL_PACKAGE_ID
          ? (componentLibrary.packages[0]?.id ?? DEFAULT_CUSTOM_PACKAGE_ID)
          : active;
      setComponentLibrary((library) => {
        const definition = { id, name, baseKind: selected.kind, style: componentStyleOf(selected) };
        const exists = library.packages.some((pack) => pack.id === packageId);
        return {
          ...library,
          activePackageId: packageId,
          packages: exists
            ? library.packages.map((pack) =>
                pack.id === packageId ? { ...pack, definitions: [...pack.definitions, definition] } : pack,
              )
            : [...library.packages, { id: packageId, name: `${t("customPackageDefault", lang)} 1`, definitions: [definition] }],
        };
      });
      patchSelected({ component: { packageId, definitionId: id } });
    },
    [componentLibrary.activePackageId, componentLibrary.packages, lang, patchSelected, selected, setComponentLibrary, snapshot],
  );

  const onUpdateComponent = useCallback(() => {
    if (!selected?.component) return;
    snapshot(true);
    const ref = selected.component;
    setComponentLibrary((library) => ({
      ...library,
      packages: library.packages.map((pack) =>
        !ref.packageId || pack.id === ref.packageId
          ? {
              ...pack,
              definitions: pack.definitions.map((definition) =>
                definition.id === ref.definitionId
                  ? { ...definition, style: { ...definition.style, ...(ref.overrides ?? {}) } }
                  : definition,
              ),
            }
          : pack,
      ),
    }));
    patchSelected({ component: { packageId: ref.packageId, definitionId: ref.definitionId } });
  }, [patchSelected, selected, setComponentLibrary, snapshot]);

  const onDetachComponent = useCallback(() => {
    if (!selectedResolved) return;
    const { component: _component, ...detached } = selectedResolved;
    patchSelected({ ...detached, component: undefined });
  }, [patchSelected, selectedResolved]);

  return {
    onActivePackage,
    onCreatePackage,
    onRenamePackage,
    onDeletePackage,
    onRenameDefinition,
    onDeleteDefinition,
    onSaveAsComponent,
    onUpdateComponent,
    onDetachComponent,
  };
}
