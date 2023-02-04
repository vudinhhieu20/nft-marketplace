import { ethers } from "ethers";
import { useEffect, useState } from "react";
import axios from "axios";
import Web3Modal from "web3modal";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import { marketplaceAddress } from "../config";

import NFTMarketplace from "../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json";

export default function CreatorDashboard() {
  const [nfts, setNfts] = useState([]);
  const [createdNfts, setCreatedNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadNFTs();
  }, []);
  async function loadNFTs() {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    const contract = new ethers.Contract(
      marketplaceAddress,
      NFTMarketplace.abi,
      signer
    );
    const data = await contract.fetchItemsListed();

    const items = await Promise.all(
      data.map(async (i) => {
        const tokenUri = await contract.tokenURI(i.tokenId);
        const meta = await axios.get(tokenUri);
        let price = ethers.utils.formatUnits(i.price.toString(), "ether");
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
        };
        return item;
      })
    );

    setNfts(items);
    setLoading(false);
    console.log(items);

    const createdItems = await contract.fetchCreatedItems();

    const createdListItems = await Promise.all(
      createdItems.map(async (i) => {
        const tokenUri = await contract.tokenURI(i.tokenId);
        const meta = await axios.get(tokenUri);
        let price = ethers.utils.formatUnits(i.price.toString(), "ether");
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
        };
        return item;
      })
    );

    setCreatedNfts(createdListItems);
    setLoading(false);
    console.log(items);
  }

  if (loading)
    return (
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
        onClick={console.log}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    );

  return (
    <div>
      <div className="p-4">
        <h2 className="text-2xl py-2">Tranh đã đăng bán và đấu giá</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {nfts.map((nft, i) => (
            <div key={i} className="border shadow rounded-xl overflow-hidden">
              <img src={nft.image} className="rounded" alt="NFT image" />
              <div className="p-4 bg-black">
                <p className="text-2xl font-bold text-white">
                  Giá - {nft.price} Eth
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-2xl py-2">Tranh đã tạo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {createdNfts.map((nft, i) => (
            <div key={i} className="border shadow rounded-xl overflow-hidden">
              <img src={nft.image} className="rounded" alt="NFT image" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
