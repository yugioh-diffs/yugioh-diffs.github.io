let makeElement = ((type, parnt, cls) =>
{
    const e = document.createElement(type);
    if (parnt)
        parnt.appendChild(e);
    if (cls)
        e.className = cls;
    return e;
});

let removeAllChildren = ((e) => { while (e.lastChild) e.removeChild(e.lastChild); });

let diffToggled = (() =>
{
    document.getElementById('data-texts').classList.toggle('highlight-diff',
        document.getElementById('data-show-diff').checked
    );
});

let convertDate = ((d) =>
{
    const str = new Date(d).toDateString();
    return (str.substr(8,3) + str.substr(4,4) + str.substr(11));
});

let loadText = ((oldContainer, newContainer, oldText, newText) =>
{
    removeAllChildren(oldContainer);
    removeAllChildren(newContainer);
    const diffResult = window.diff(oldText, newText);
    for (const [whose, part] of diffResult)
    {
        if (whose < 0)
            makeElement('span', oldContainer, 'deletion-word').innerText = part;
        else if (whose > 0)
            makeElement('span', newContainer, 'addition-word').innerText = part;
        else
        {
            makeElement('span', oldContainer, null).innerText = part;
            makeElement('span', newContainer, null).innerText = part;
        }
    }
});

let currentEntry = undefined;
let loadEntry = ((entry) =>
{
    if (currentEntry === entry)
        return;

    currentEntry = entry;
    
    if (!entry)
    {
        window.location.hash = '';
        document.body.classList.remove('has-data');
        document.title = 'Yu-Gi-Oh! TCG Product Errors';
        return;
    }
    
    window.location.hash = ('#'+entry.id);
    document.body.classList.add('has-data');
    document.getElementById('data-artwork').src = ('artwork/'+entry.id+'.png');
    document.getElementById('data-name').innerText = entry.name;
    document.title = (entry.name + ' – Yu-Gi-Oh! TCG Product Errors');
    
    loadText(document.getElementById('current-text'), document.getElementById('proposed-text'), entry.oldText, entry.newText);
    
    const extraInfoEntries = document.getElementById('data-extra-info-entries');
    removeAllChildren(extraInfoEntries);
    let i = -1;
    for (const reference of entry.references)
    {
        ++i;
        if (i >= 10) break;

        let url = null;
        try { url = new URL(reference.url); }
        catch (e) {}
        
        const extraInfoEntry = makeElement('div', extraInfoEntries, 'data-extra-info-entry');
        makeElement('div', extraInfoEntry, 'data-extra-info-number').innerText = ('('+String.fromCharCode(0x2160+i)+')');
        
        const extraInfoText = makeElement('div', extraInfoEntry, 'data-extra-info-text');
        const extraInfoRefContainer = makeElement('div', extraInfoText, 'data-extra-info-ref-container');
        const extraInfoRef = makeElement('span', extraInfoRefContainer, 'data-extra-info-ref');
        const extraInfoLink = makeElement('a', extraInfoRef, 'data-extra-info-link');
        if (url)
            extraInfoLink.href = url.href;
        extraInfoLink.target = '_blank';
        extraInfoLink.innerText = reference.title;
        extraInfoRef.appendChild(document.createTextNode(', '));
        makeElement('span', extraInfoRef, 'data-extra-info-domain').innerText = (url ? url.hostname : '<invalid URL>');
        extraInfoRefContainer.appendChild(document.createTextNode(' '));
        makeElement('span', extraInfoRefContainer, 'data-extra-info-date').innerText = ('(accessed '+convertDate(reference.date)+')');
        makeElement('div', extraInfoText, 'data-extra-info-blurb').innerText = reference.desc;
    }
    
    document.getElementById('data-last-print-date').innerText = convertDate(entry.lastPrint);
    document.getElementById('data-last-update-date').innerText = convertDate(entry.lastUpdated);
});

document.addEventListener('DOMContentLoaded', async () =>
{
    document.getElementById('data-show-diff').addEventListener('change', diffToggled);
    diffToggled();
    
    const entries = await (await fetch('entries.json')).json();
    
    /*
        entries is:
        [
            {
                id // konami database id
                icon
                name
                oldText
                newText
                author
                lastPrint
                lastUpdated
                references // [
                    {
                        url
                        title
                        date
                        desc
                    }
                ]
            }
        ]
    */
	
	let sorters = {};
	sorters.alpha = ((a,b) =>
	{
		const n1 = a.name;
		const n2 = b.name;
		if (n1 < n2)
			return -1;
		else if (n1 > n2)
			return 1;
		else
			return 0;
	});
	sorters.recent = ((a,b) =>
	{
		const l1 = new Date(a.lastUpdated);
		const l2 = new Date(b.lastUpdated);
		if (l1 < l2)
			return 1;
		else if (l1 > l2)
			return -1;
		else
			return sorters.alpha(a,b);
	});
	
	let activeSorter = (window.localStorage.getItem('sortMode') || '');
	if (!(activeSorter in sorters))
		activeSorter = 'alpha';
    
	const redrawSelector = (() =>
	{
		entries.sort(sorters[activeSorter]);
		
		const selector = document.getElementById('selector');
		removeAllChildren(selector);
		
		for (const entry of entries)
		{
			const selectorEntry = makeElement('a', selector, 'selector-entry');
			const selectorIcon = makeElement('img', selectorEntry, 'selector-icon');
			const selectorName = makeElement('span', selectorEntry, 'selector-name');
			
			selectorEntry.href = ('#'+entry.id);
			selectorIcon.src = ('img/card_icon_'+entry.icon+'.png');
			selectorName.innerText = entry.name;
			
			// preload
			if (!entry.hadPreload)
				(entry.hadPreload = new Image()).src = ('artwork/'+entry.id+'.png');
		}
	});
	
	redrawSelector();
	
	for (const btn of document.querySelectorAll('.control-button[data-sort-mode]'))
	{
		const thisMode = btn.dataset.sortMode;
		if (thisMode === activeSorter)
			btn.classList.add('selected');
		btn.addEventListener('click', () =>
		{
			if (thisMode === activeSorter) return;
			
			document.querySelectorAll('.control-button[data-sort-mode].selected').forEach((b) => b.classList.remove('selected'));

			window.localStorage.setItem('sortMode', (activeSorter = thisMode));
			redrawSelector();
			btn.classList.add('selected');
		});
	}
    
    const hashchange = (() =>
    {
        let entry = undefined;
        if (window.location.hash)
        {
            const n = parseInt(window.location.hash.substr(1));
            if (!isNaN(n))
                entry = entries.find((e) => (e.id === n));
        }
        loadEntry(entry);
    });
    window.addEventListener('hashchange', hashchange);
    
    if (window.location.hash.length)
        hashchange();

    if (currentEntry)
        await document.getElementById('data-artwork').decode();
    document.body.classList.remove('has-modal','modal-loading');
});
